import argparse
import re

import librosa
import numpy as np
import whisperx

FILLERS = {"uh", "um", "er", "ah", "eh", "mm", "hmm", "well", "so", "okay", "right", "basically", "actually",
           "literally", "like", "just"}


def transcribe_and_align(audio_path):
    audio = whisperx.load_audio(audio_path)
    model = whisperx.load_model("large-v3", language="en", device="cpu")

    transcription = model.transcribe(audio)
    text = " ".join(segment["text"].strip() for segment in transcription["segments"]).lower()

    align_model, metadata = whisperx.load_align_model(language_code=transcription["language"], device="cpu")
    aligned = whisperx.align(transcription["segments"], align_model, metadata, audio, device="cpu")

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


def build_timeline(duration, disfluencies, fillers, pauses, time_step=0.1):
    n_steps = int(duration / time_step)
    timeline = [None] * n_steps

    def mark(start, end, label):
        start_i = int(start / time_step)
        end_i = int(end / time_step)

        for i in range(start_i, min(end_i + 1, n_steps)):
            timeline[i] = label

    for s, e, t in disfluencies:
        mark(s, e, t)

    for f in fillers:
        mark(f["start"], f["end"], "filler")

    for p in pauses:
        mark(p["start"], p["end"], "pause")

    return timeline


def main(input_path: str):
    text, words = transcribe_and_align(input_path)

    repetitions = detect_repetitions(words)
    prolongations = detect_prolongations(words)
    fillers = detect_fillers(words)
    pauses = detect_long_pauses(words)

    disfluencies = merge_segments(repetitions + prolongations)

    waveform, sample_rate = librosa.load(input_path, sr=22050)
    duration = len(waveform) / sample_rate

    timeline = build_timeline(duration, disfluencies, fillers, pauses)

    duration_seconds = words[-1]["end"] if words else 0
    n_steps = int(duration_seconds) + 1
    pace_timeline = [0] * n_steps
    for word in words:
        start_sec = int(word["start"])
        if start_sec < n_steps:
            pace_timeline[start_sec] += 1

    return ",".join(str(value) for value in timeline), pace_timeline


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", required=True)
    args = parser.parse_args()

    result, pace = main(args.wav)
    print("Disfluency timeline:", result)
    print("Pace (words/sec):", pace)
