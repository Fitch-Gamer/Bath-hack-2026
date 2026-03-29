import argparse
import time
from pathlib import Path

import cv2
import numpy as np
import torch

from l2cs import select_device, Pipeline

THRESHOLD = 10


def main(input_path: str):
    capture = cv2.VideoCapture(input_path)
    if not capture.isOpened():
        raise IOError(f"Cannot open {input_path}!")

    pipeline = Pipeline(weights=Path("models/L2CSNet_gaze360.pkl"), arch="ResNet50", device=select_device("cpu"), )

    gaze_history = []
    frame_count = 0
    start_time = time.time()

    with torch.inference_mode():
        while True:
            success, frame = capture.read()
            if not success:
                break

            results = pipeline.step(frame)

            for pitch, yaw in zip(results.pitch, results.yaw):
                is_looking = np.hypot(pitch * 180 / np.pi, yaw * 180 / np.pi) <= THRESHOLD
                gaze_history.append(is_looking)

            frame_count += 1

    print(f"Processed {frame_count} frames in {time.time() - start_time} seconds.")

    mode_list = []

    for start in range(0, len(gaze_history), 10):
        batch = gaze_history[start:start + 10]
        batch_mode = bool(np.round(np.mean(batch)))
        mode_list.append(batch_mode)

    return ",".join(str(value) for value in mode_list)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', type=str, required=True)
    args = parser.parse_args()

    result = main(args.video)
    print(result)
