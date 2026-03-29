import re

import matplotlib.pyplot as plt
import numpy as np
import sounddevice as sd
import soundfile as sf
import whisperx
from matplotlib.patches import Patch

FILLERS = {"uh", "um", "er", "ah", "eh", "mm", "hmm", "well", "so", "okay", "right", "basically", "actually",
           "literally", "like", "just"}


def record_audio(sample_rate=22050):
    print(f"Recording audio...")
    audio = sd.rec(int(10 * sample_rate), samplerate=sample_rate, channels=1, dtype='float32')
    sd.wait()
    audio = audio.flatten()
    print("Recording finished.")
    return audio, sample_rate


def transcribe_and_align(audio_path, model_name="large-v3"):
    audio = whisperx.load_audio(audio_path)
    model = whisperx.load_model(model_name, language="en", device="cpu")
    print(f"Loading WhisperX model: {model_name}")

    result = model.transcribe(audio)
    text = " ".join(segment["text"].strip() for segment in result["segments"]).lower()
    print(f"Transcript: {text}")

    align_model, metadata = whisperx.load_align_model(language_code=result["language"], device="cpu")
    aligned = whisperx.align(result["segments"], align_model, metadata, audio, device="cpu")

    words = []
    for segment in aligned["segments"]:
        for word in segment["words"]:
            if "start" in word and "end" in word:
                words.append({"word": word["word"], "start": float(word["start"]), "end": float(word["end"]), })
    return text, words


def normalize(word):
    return re.sub(r"[^a-z0-9']", "", word.lower())


def detect_repetitions(words):
    repetitions = []

    for i, word in enumerate(words):
        current_word = normalize(word["word"])
        if not current_word:
            continue

        if i > 0:
            previous_word = normalize(words[i - 1]["word"])
            if current_word == previous_word:
                repetitions.append((words[i - 1]["start"], word["end"], "repetition"))

        if i > 1:
            previous_word_2 = normalize(words[i - 2]["word"])
            if current_word == previous_word_2:
                gap = word["start"] - words[i - 2]["end"]
                if gap < 1:
                    repetitions.append((words[i - 2]["start"], word["end"], "repetition"))

        if "-" in word["word"]:
            parts = word["word"].split("-")
            if len(parts) >= 2 and parts[0] == parts[1][:len(parts[0])]:
                repetitions.append((word["start"], word["end"], "repetition"))

    return repetitions


def detect_fillers(words):
    fillers = []

    for word in words:
        current_word = normalize(word["word"])

        if current_word in FILLERS:
            fillers.append({"start": word["start"], "end": word["end"], "label": "filler", "word": current_word, })

    return fillers


def detect_prolongations(words):
    prolongations = []

    for word in words:
        current_word = normalize(word["word"])
        if not current_word:
            continue

        duration = word["end"] - word["start"]
        expected = max(0.15, 0.05 * len(current_word))

        if duration > expected * 2.5:
            prolongations.append((word["start"], word["end"], "prolong"))

    return prolongations


def detect_long_pauses(words):
    pauses = []

    if len(words) < 2:
        return pauses

    gaps = [words[i + 1]["start"] - words[i]["end"] for i in range(len(words) - 1)]
    threshold = max(0.6, np.mean(gaps) + 1.5 * np.std(gaps))

    for i, gap in enumerate(gaps):
        if gap > threshold:
            pauses.append(
                {"start": words[i]["end"], "end": words[i + 1]["start"], "duration": gap, "label": "long_pause", })

    return pauses


def merge_segments(segments, gap=0.2):
    if not segments:
        return []

    segments = sorted(segments, key=lambda x: x[0])
    merged = [segments[0]]

    for start, end, label in segments[1:]:
        prev_start, prev_end, prev_label = merged[-1]

        if label == prev_label and start - prev_end < gap:
            merged[-1] = (prev_start, max(prev_end, end), label)
        else:
            merged.append((start, end, label))

    return merged


def plot_results(waveform, sample_rate, words, disfluencies, fillers, pauses, text):
    times = np.linspace(0, len(waveform) / sample_rate, len(waveform))

    figure, axis = plt.subplots(figsize=(14, 5))
    axis.plot(times, waveform, alpha=0.4)

    axis.set_title(f"Disfluency Detection\n{text}")
    axis.set_xlabel("Time (s)")

    y_max = np.max(waveform)

    for word in words:
        mid = (word["start"] + word["end"]) / 2
        axis.text(mid, y_max * 0.8, word["word"], rotation=30, ha="center", fontsize=8)

    # disfluencies
    for s, e, t in disfluencies:
        axis.axvspan(s, e, color="red", alpha=0.3)
        axis.text((s + e) / 2, y_max, t, ha="center", color="red")

    for filler in fillers:
        axis.axvspan(filler["start"], filler["end"], color="orange", alpha=0.4)

    for pause in pauses:
        axis.axvspan(pause["start"], pause["end"], color="blue", alpha=0.2)

    legend = [Patch(color="red", alpha=0.3, label="Disfluency"), Patch(color="orange", alpha=0.4, label="Filler"),
              Patch(color="blue", alpha=0.2, label="Pause"), ]

    axis.legend(handles=legend)
    plt.tight_layout()
    plt.savefig("output.png")
    plt.close()


def main():
    audio, sample_rate = record_audio()

    output_file = "recording.wav"
    sf.write(output_file, audio, sample_rate)
    print(f"Audio saved to {output_file}")

    text, words = transcribe_and_align(output_file)

    repetitions = detect_repetitions(words)
    prolongations = detect_prolongations(words)
    fillers = detect_fillers(words)
    pauses = detect_long_pauses(words)

    disfluencies = merge_segments(repetitions + prolongations)

    print(f"Repetitions: {len(repetitions)}")
    print(f"Prolongations: {len(prolongations)}")
    print(f"Fillers: {len(fillers)}")
    print(f"Pauses: {len(pauses)}")

    plot_results(audio, sample_rate, words, disfluencies, fillers, pauses, text)


if __name__ == "__main__":
    main()
