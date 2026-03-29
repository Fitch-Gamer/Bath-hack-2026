from pathlib import Path

import cv2
import numpy as np
import torch

from l2cs import select_device, Pipeline, render

THRESHOLD = 10

if __name__ == "__main__":
    capture = cv2.VideoCapture(0)
    if not capture.isOpened():
        raise IOError(f"Cannot open webcam!")

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(capture.get(cv2.CAP_PROP_FPS))

    output = cv2.VideoWriter("output.mp4", cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

    pipeline = Pipeline(
        weights=Path("models/L2CSNet_gaze360.pkl"),
        arch="ResNet50",
        device=select_device("cpu"),
    )

    with torch.inference_mode():
        while True:
            success, frame = capture.read()
            if not success:
                break

            results = pipeline.step(frame)
            frame = render(frame, results)

            for pitch, yaw in zip(results.pitch, results.yaw):
                is_looking = np.hypot(pitch * 180 / np.pi, yaw * 180 / np.pi) <= THRESHOLD

                status_text = "Looking" if is_looking else "Not Looking"
                color = (0, 255, 0) if is_looking else (0, 0, 255)
                cv2.putText(frame, status_text, (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

            cv2.imshow("Gaze Detection", frame)
            output.write(frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    capture.release()
    output.release()
    cv2.destroyAllWindows()