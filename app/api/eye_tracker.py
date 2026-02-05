# eye_tracker.py
import time
import requests
import your_eye_tracker_sdk  # ← replace with the real SDK import

API = "http://localhost:5000/api/aoi_event"
SESSION_ID = "YOUR-SESSION-ID"  # generate or pass in

def main():
    # initialize your hardware tracker
    tracker = your_eye_tracker_sdk.initialize()
    start = time.time()

    while True:
        sample = tracker.get_frame()  # returns frame with left/right eye (x,y)
        now_ms = int((time.time() - start) * 1000)
        x_left, y_left = sample.left_eye
        x_right, y_right = sample.right_eye
        # map to screen or AOI:
        gaze_x = (x_left + x_right) / 2
        gaze_y = (y_left + y_right) / 2

        # find AOI under gaze:
        # you could call a microservice that mirrors document.elementFromPoint,
        # or predefine AOI boxes server-side. For now, leave blank:
        eye_aoi = ""

        payload = {
            "session_id": SESSION_ID,
            "event_type": "eye_gaze",
            "timestamp_ms": now_ms,
            "coordinates": {"x": gaze_x, "y": gaze_y},
            "mouse_click": False,
            "text_input": False,
            "text_activity": "",
            "eye_aoi": eye_aoi,
            "left_eye_x": x_left,
            "left_eye_y": y_left,
            "right_eye_x": x_right,
            "right_eye_y": y_right
        }
        requests.post(API, json=payload)
        time.sleep(0.033)  # ~30 Hz

if __name__ == "__main__":
    main()
