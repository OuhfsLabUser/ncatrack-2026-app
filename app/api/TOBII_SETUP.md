# Tobii Eye Tracker Integration Guide

## Overview

This system integrates the Tobii Pro SDK to automatically collect eye-tracking data and include it in AOI data.

## Installation Steps

### 1. Install Python Dependencies

Ensure you use Python 3.10.x (3.10.18 recommended):

```bash
cd ncatrack-2026/app/api
pip install -r requirements_tobii.txt
```

Or install manually:

```bash
pip install tobii-research requests
```

### 2. Verify Tobii Eye Tracker Connection

Run the following command to check if the eye tracker is detected:

```bash
python tobii_eye_tracker.py
```

If the eye tracker is detected, device information will be displayed.

## How It Works

### Data Collection Flow

1. **Frontend starts tracking**: When the user starts AOI tracking in the frontend, it automatically calls the `/api/eye_tracker/start` API
2. **Python process starts**: The backend starts a Python process that connects to the Tobii eye tracker
3. **Real-time data collection**:
   - Tobii collects eye-tracking data at device frequency (typically 60–120 Hz)
   - The Python script converts normalized coordinates (0–1) to screen pixel coordinates
   - Data is sent in real time to the `/api/aoi_event` API
4. **Data logging**: Eye-tracking data and AOI events are recorded in the same CSV file
5. **Stop collection**: When the user stops tracking, the frontend calls the `/api/eye_tracker/stop` API

### Coordinate Conversion

Tobii returns **normalized coordinates** (0–1) representing position relative to the display area:
- `position_on_display_area[0]`: X coordinate (0 = left edge, 1 = right edge)
- `position_on_display_area[1]`: Y coordinate (0 = top edge, 1 = bottom edge)

The script converts these to screen pixel coordinates:
- `left_eye_x = position_on_display_area[0] * screen_width`
- `left_eye_y = position_on_display_area[1] * screen_height`

### Data Validity

Tobii’s `validity` field indicates data validity:
- `validity == 1`: Valid data
- `validity == 0`: Invalid data (eye not detected or data unreliable)

The script only processes valid data; invalid data is skipped.

## API Endpoints

### Start Eye Tracking

```http
POST /api/eye_tracker/start
Content-Type: application/json

{
  "session_id": "your-session-id",
  "screen_width": 1920,
  "screen_height": 1080
}
```

### Stop Eye Tracking

```http
POST /api/eye_tracker/stop
Content-Type: application/json

{
  "session_id": "your-session-id"
}
```

### Get Status

```http
GET /api/eye_tracker/status/:session_id
```

## Data Format

Eye-tracking data is sent to the AOI API as `eye_gaze` events with the following fields:

- `left_eye_x`: Left eye X coordinate (pixels)
- `left_eye_y`: Left eye Y coordinate (pixels)
- `right_eye_x`: Right eye X coordinate (pixels)
- `right_eye_y`: Right eye Y coordinate (pixels)
- `coordinates.x`: Average gaze point X coordinate
- `coordinates.y`: Average gaze point Y coordinate

## Troubleshooting

### Issue: Eye tracker not found

- Ensure the Tobii eye tracker is connected and powered on
- Check that the Tobii Pro SDK is installed correctly
- Run `python tobii_eye_tracker.py` to see detailed error messages

### Issue: All coordinates are 0

- Check that screen resolution is set correctly
- Confirm the `validity` field is 1 (valid data)
- Verify that eye tracker calibration is complete

### Issue: Python process fails to start

- Ensure Python 3.10.x is installed and on your PATH
- Check that the `tobii-research` library is installed correctly
- Review error messages in the server logs

## Notes

1. **Python version**: Python 3.10.x is required (Tobii Pro SDK requirement)
2. **Screen resolution**: Ensure the resolution passed from the frontend matches the actual screen
3. **Data frequency**: Eye-tracking collection frequency depends on the device (typically 60–120 Hz) and may be higher than mouse event frequency
4. **Time sync**: Eye-tracking data uses the same timestamp system as AOI events for synchronization
