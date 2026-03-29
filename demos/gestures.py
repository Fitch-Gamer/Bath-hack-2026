import time

import cv2
import torch

from src.utils_demo import (FaceDetectorCV2, FaceTracker, HGPredictor, MediapipePredictor, TrackHandler, Visualizer)

if __name__ == "__main__":
    capture = cv2.VideoCapture(0)
    if not capture.isOpened():
        raise IOError(f"Cannot open webcam!")

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(capture.get(cv2.CAP_PROP_FPS))

    visualizer = Visualizer(draw_bbox=True, draw_landmarks=True, draw_head_gesture=True)
    output = cv2.VideoWriter("output.mp4", cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

    face_detector = FaceDetectorCV2()
    face_tracker = FaceTracker()
    face_predictor = MediapipePredictor()
    hg_predictor = HGPredictor("cpu")
    track_handler = TrackHandler(face_tracker)

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
            frame = visualizer.process(frame, face_tracker, output_track)

            cv2.imshow("Gesture Detection", frame)
            output.write(frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    capture.release()
    output.release()
    cv2.destroyAllWindows()
