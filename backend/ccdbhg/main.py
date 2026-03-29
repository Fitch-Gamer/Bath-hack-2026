import argparse
import time

import cv2
import numpy as np
import torch

from src.utils_demo import (FaceDetectorCV2, FaceTracker, HGPredictor, MediapipePredictor, TrackHandler, )


def main(input_path: str):
    capture = cv2.VideoCapture(input_path)
    if not capture.isOpened():
        raise IOError(f"Cannot open {input_path}!")

    face_detector = FaceDetectorCV2()
    face_tracker = FaceTracker()
    face_predictor = MediapipePredictor()
    hg_predictor = HGPredictor("cpu")
    track_handler = TrackHandler(face_tracker)

    gesture_history = []
    frame_count = 0
    start_time = time.time()

    with torch.inference_mode():
        while True:
            success, frame = capture.read()
            if not success:
                break

            frame_time = int(round(time.time() * 1000))

            detection = face_detector.process_image(frame)
            face_tracker.update(detection, frame_time)
            track_ids = face_tracker.get_tracks()

            for track_id in track_ids:
                face_prediction = face_predictor.process_face(frame, face_tracker.tracks_store[track_id][-1])
                face_tracker.tracks_store[track_id][-1].add_prediction(face_prediction)

            output_track = hg_predictor.process(face_tracker, track_ids)
            track_handler.add_track_prediction(output_track)

            if track_ids:
                first_track_id = track_ids[0]
                frame_gesture = output_track[first_track_id]
            else:
                frame_gesture = None
            gesture_history.append(frame_gesture)

            frame_count += 1

    print(f"Processed {frame_count} frames in {time.time() - start_time} seconds.")

    mode_list = []

    for start in range(0, len(gesture_history), 10):
        batch = gesture_history[start:start + 10]
        batch = [gesture["head_gesture"] for gesture in batch if gesture is not None]

        if batch:
            values, counts = np.unique(batch, return_counts=True)
            most_common = values[np.argmax(counts)]
        else:
            most_common = None

        mode_list.append(most_common)

    return ",".join(str(value) for value in mode_list)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', type=str, required=True)
    args = parser.parse_args()

    result = main(args.video)
    print(result)
