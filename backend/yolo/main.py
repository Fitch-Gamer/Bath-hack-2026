import os
import sys
import json
import torch
import gc
import multiprocessing
import librosa
import numpy as np
import matplotlib.pyplot as plt
from torch import nn
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
import whisperx

# Add yolo-stutter to path to import utils
YOLO_STUTTER_PATH = os.path.join(os.getcwd(), 'yolo-stutter')
if YOLO_STUTTER_PATH not in sys.path:
    sys.path.append(YOLO_STUTTER_PATH)

from utils.vits import commons
from utils.vits import utils as vit_utils
from utils.vits.models import SynthesizerTrn
from utils.vits.text.symbols import symbols
from utils.vits.text import text_to_sequence
from utils.vits.mel_processing import spectrogram_torch
from utils.model_utils.conv1d_transformer import Conv1DTransformerDecoder

def get_text_tokens(text, hps):
    """Convert text to tokens for VITS model."""
    text_norm = text_to_sequence(text, hps.data.text_cleaners)
    if hps.data.add_blank:
        text_norm = commons.intersperse(text_norm, 0)
    return torch.LongTensor(text_norm)

def prepare_audio_spec(filename, target_sr=22050):
    """Load audio, resample, and compute spectrogram for VITS."""
    audio, _ = librosa.load(filename, sr=target_sr, mono=True)
    audio_pt = torch.FloatTensor(audio)
    
    # Standard VITS normalization (matching get_audio_a in training)
    normalized_waveform = audio_pt / torch.max(torch.abs(audio_pt))
    audio_scaled = normalized_waveform * 32767
    audio_norm = audio_scaled / 32768.0
    
    if len(audio_norm.shape) == 1:
        audio_norm = audio_norm.unsqueeze(0)
    
    spec = spectrogram_torch(
        audio_norm, 
        1024, # filter_length
        target_sr, 
        256, # hop_length
        1024, # win_length
        center=False
    )
    return spec.squeeze(0), audio_norm

def transcribe_and_align(audio_path, device="cpu"):
    """
    Perform ASR with Wav2Vec2 (literal) and align with WhisperX.
    Returns literal transcription and word-level alignments.
    """
    num_cores = multiprocessing.cpu_count()
    torch.set_num_threads(num_cores)
    print(f"[*] Transcription: Using {num_cores} CPU threads.")

    # 1. Wav2Vec2 for literal transcription
    print("[*] Loading Wav2Vec2 (literal ASR)...")
    model_id = "facebook/wav2vec2-base-960h"
    processor = Wav2Vec2Processor.from_pretrained(model_id)
    asr_model = Wav2Vec2ForCTC.from_pretrained(model_id).to(device)

    # whisperx.load_audio resamples to 16kHz
    waveform_16k = whisperx.load_audio(audio_path)
    inputs = processor(waveform_16k, sampling_rate=16000, return_tensors="pt", padding=True).to(device)
    
    with torch.no_grad():
        logits = asr_model(inputs.input_values).logits
    predicted_ids = torch.argmax(logits, dim=-1)
    literal_text = processor.batch_decode(predicted_ids)[0].lower()
    print(f"[*] Transcription: '{literal_text}'")

    # Cleanup ASR model
    del asr_model, processor
    gc.collect()

    # 2. WhisperX for alignment
    print("[*] Loading WhisperX alignment (English)...")
    audio_duration = len(waveform_16k) / 16000.0
    initial_segments = [{
        "text": literal_text,
        "start": 0.0,
        "end": audio_duration
    }]
    
    align_model, align_metadata = whisperx.load_align_model(language_code="en", device=device)
    alignment_result = whisperx.align(
        initial_segments, align_model, align_metadata, waveform_16k, device, return_char_alignments=False
    )
    
    word_alignments = []
    for segment in alignment_result["segments"]:
        for word in segment.get("words", []):
            if "start" in word and "end" in word:
                word_alignments.append({
                    "word": word["word"],
                    "start": word["start"],
                    "end": word["end"]
                })
    
    return literal_text, word_alignments

def detect_disfluencies(wav_path, literal_text, device="cpu"):
    """Run VITS + Transformer Decoder to find disfluencies."""
    config_path = "yolo-stutter/utils/vits/configs/ljs_base.json"
    vits_model_path = "yolo-stutter/saved_models/pretrained_ljs.pth"
    decoder_model_path = "yolo-stutter/saved_models/decoder_tts_new_l"
    
    if not os.path.exists(vits_model_path) or not os.path.exists(decoder_model_path):
        raise FileNotFoundError("Required model checkpoints not found.")

    hps = vit_utils.get_hparams_from_file(config_path)
    
    # Load VITS
    vits = SynthesizerTrn(
        len(symbols),
        hps.data.filter_length // 2 + 1,
        hps.train.segment_size // hps.data.hop_length,
        **hps.model
    ).to(device)
    vit_utils.load_checkpoint(vits_model_path, vits, None)
    vits.eval()

    # Load Disfluency Decoder
    decoder = torch.load(decoder_model_path, map_location=device, weights_only=False)
    decoder.eval()

    # Prepare inputs
    spec, wav_norm = prepare_audio_spec(wav_path)
    tokens = get_text_tokens(literal_text, hps)
    
    x = tokens.unsqueeze(0).to(device)
    x_lengths = torch.LongTensor([tokens.size(0)]).to(device)
    y = spec.unsqueeze(0).to(device)
    y_lengths = torch.LongTensor([y.shape[-1]]).to(device)
    
    with torch.no_grad():
        # VITS forward to get attention
        _, _, (neg_cent, attn), _, _, _, _ = vits(x, x_lengths, y, y_lengths)
        soft_attention = nn.functional.softmax(neg_cent, dim=-1)
        
        # Pad for decoder (expects 1024x768)
        padded_attn = nn.functional.pad(
            soft_attention, (0, 768 - soft_attention.shape[-1], 0, 1024 - soft_attention.shape[-2])
        )
        
        # Decoder downsamples by 16
        downsample_factor = 16
        num_regions = (y_lengths // downsample_factor)
        mask = torch.ones((1, 64), dtype=torch.bool).to(device)
        mask[0, :num_regions[0] + 1] = False
        
        output = decoder(padded_attn, mask)
        
    # Process predictions
    # norm_to_sec matches training: (normalized * 1024 * 256) / 22050
    norm_to_sec = (1024 * 256) / 22050.0
    # step_to_sec: each decoder step is downsample_factor * hop_length
    step_to_sec = (downsample_factor * 256) / 22050.0
    
    bounds_pred = output[0, :num_regions[0], :2]
    exists_pred = torch.clamp(output[0, :num_regions[0], 2], 0, 1)
    type_pred = output[0, :num_regions[0], 3:]
    
    exists_mask = exists_pred > 0.5
    _, type_indices = torch.max(type_pred, dim=-1)
    
    label_names = ["reptition", "block", "missing", "replace", "prolong"]
    
    disfluencies = []
    in_seg = False
    start_idx = 0
    
    for i in range(len(exists_mask)):
        if exists_mask[i] and not in_seg:
            in_seg = True
            start_idx = i
        elif not exists_mask[i] and in_seg:
            # End of a continuous disfluent region
            seg_slice = slice(start_idx, i)
            # Pick the peak existence prediction in this segment
            peak_idx = start_idx + torch.argmax(exists_pred[seg_slice]).item()
            
            s_t = bounds_pred[peak_idx, 0].item() * norm_to_sec
            e_t = bounds_pred[peak_idx, 1].item() * norm_to_sec
            t_idx = type_indices[peak_idx].item()
            
            # Fallback if boundaries are zero or illogical
            if (s_t == 0 and e_t == 0) or (e_t <= s_t):
                s_t = start_idx * step_to_sec
                e_t = i * step_to_sec
                
            disfluencies.append((s_t, e_t, label_names[t_idx]))
            in_seg = False
            
    # Handle edge case for last segment
    if in_seg:
        peak_idx = start_idx + torch.argmax(exists_pred[start_idx:]).item()
        s_t = bounds_pred[peak_idx, 0].item() * norm_to_sec
        e_t = bounds_pred[peak_idx, 1].item() * norm_to_sec
        t_idx = type_indices[peak_idx].item()
        if (s_t == 0 and e_t == 0) or (e_t <= s_t):
            s_t = start_idx * step_to_sec
            e_t = len(exists_mask) * step_to_sec
        disfluencies.append((s_t, e_t, label_names[t_idx]))

    return disfluencies, wav_norm.squeeze().numpy()

def plot_results(wav_np, literal_text, disfluencies, word_alignments, output_path):
    """Generate the visualization graph."""
    sr = 22050
    times = np.linspace(0, len(wav_np) / sr, num=len(wav_np))
    
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(times, wav_np, color='gray', alpha=0.4)
    ax.set_title(f"Disfluency Detection\nText: {literal_text}")
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Amplitude")
    
    # Plot word segments from WhisperX
    for w in word_alignments:
        mid = (w["start"] + w["end"]) / 2
        ax.axvline(w["start"], color='green', linestyle=':', alpha=0.3)
        ax.text(mid, max(wav_np) * 0.85, w["word"], ha='center', fontsize=9, rotation=30)
        
    # Highlight detected disfluencies
    for s, e, d_type in disfluencies:
        ax.axvspan(s, e, color='red', alpha=0.25)
        ax.text((s + e) / 2, max(wav_np) * 1.05, d_type, color='red', fontweight='bold', ha='center')
        
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"[*] Graph saved: {output_path}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Disfluency detection demo')
    parser.add_argument('--wav', type=str, required=True, help='Path to WAV file')
    parser.add_argument('--output', type=str, default='disfluency_graph.png', help='Output graph filename')
    args = parser.parse_args()

    device = torch.device("cpu")
    
    print(f"[*] Processing: {args.wav}")
    
    # 1. ASR & Alignment
    literal_text, word_alignments = transcribe_and_align(args.wav, device)
    
    # 2. ML Detection
    disfluencies, wav_np = detect_disfluencies(args.wav, literal_text, device)
    
    # 3. Visualization
    plot_results(wav_np, literal_text, disfluencies, word_alignments, args.output)

if __name__ == "__main__":
    main()
