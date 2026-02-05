#!/usr/bin/env python3
"""
Tobii Eye Tracker Integration for AOI Tracking
This script connects to a Tobii eye tracker and sends gaze data to the AOI API.
"""

import time
import requests
import json
import sys
from datetime import datetime
import tobii_research as tr

# Configuration
API_BASE = "http://localhost:5000"
SESSION_ID = None  # Will be set via command line or API
SCREEN_WIDTH = 1920  # Default screen width (will be updated from frontend)
SCREEN_HEIGHT = 1080  # Default screen height (will be updated from frontend)

# Global variables
eyetracker = None
is_collecting = False
session_start_time = None
gaze_data_list = []

def find_eyetracker():
    """Find and connect to Tobii eye tracker"""
    global eyetracker
    found_eyetrackers = tr.find_all_eyetrackers()
    
    if len(found_eyetrackers) == 0:
        print("No eye trackers found!")
        return None
    elif len(found_eyetrackers) == 1:
        eyetracker = found_eyetrackers[0]
        print(f"Found eye tracker: {eyetracker.model}")
        print(f"Serial number: {eyetracker.serial_number}")
        print(f"Frequency: {eyetracker.get_gaze_output_frequency()} Hz")
        return eyetracker
    else:
        print(f"Found {len(found_eyetrackers)} eye trackers:")
        for i, et in enumerate(found_eyetrackers):
            print(f"  {i+1}. {et.model} - {et.serial_number}")
        # Use the first one by default
        eyetracker = found_eyetrackers[0]
        print(f"Using: {eyetracker.model}")
        return eyetracker

def gaze_data_callback(gaze_data):
    """Callback function to handle gaze data from Tobii"""
    global is_collecting, session_start_time, gaze_data_list
    
    if not is_collecting:
        return
    
    # Store gaze data for processing
    gaze_data_list.append(gaze_data)
    
    # Process the gaze data
    try:
        # Get left and right eye gaze points
        # Tobii returns normalized coordinates (0-1) in position_on_display_area
        left_eye = gaze_data.left_eye
        right_eye = gaze_data.right_eye
        
        # Extract gaze point coordinates (normalized 0-1)
        # Validity: 1 = valid, 0 = invalid
        left_gaze_x_norm = None
        left_gaze_y_norm = None
        right_gaze_x_norm = None
        right_gaze_y_norm = None
        
        # Check if left eye gaze point is valid
        if hasattr(left_eye, 'gaze_point') and hasattr(left_eye.gaze_point, 'validity'):
            if left_eye.gaze_point.validity == 1:  # Valid gaze point
                if hasattr(left_eye.gaze_point, 'position_on_display_area') and len(left_eye.gaze_point.position_on_display_area) >= 2:
                    left_gaze_x_norm = left_eye.gaze_point.position_on_display_area[0]
                    left_gaze_y_norm = left_eye.gaze_point.position_on_display_area[1]
        
        # Check if right eye gaze point is valid
        if hasattr(right_eye, 'gaze_point') and hasattr(right_eye.gaze_point, 'validity'):
            if right_eye.gaze_point.validity == 1:  # Valid gaze point
                if hasattr(right_eye.gaze_point, 'position_on_display_area') and len(right_eye.gaze_point.position_on_display_area) >= 2:
                    right_gaze_x_norm = right_eye.gaze_point.position_on_display_area[0]
                    right_gaze_y_norm = right_eye.gaze_point.position_on_display_area[1]
        
        # Convert normalized coordinates (0-1) to screen pixel coordinates
        if left_gaze_x_norm is not None and left_gaze_y_norm is not None:
            left_eye_x = int(left_gaze_x_norm * SCREEN_WIDTH)
            left_eye_y = int(left_gaze_y_norm * SCREEN_HEIGHT)
        else:
            left_eye_x = None
            left_eye_y = None
        
        if right_gaze_x_norm is not None and right_gaze_y_norm is not None:
            right_eye_x = int(right_gaze_x_norm * SCREEN_WIDTH)
            right_eye_y = int(right_gaze_y_norm * SCREEN_HEIGHT)
        else:
            right_eye_x = None
            right_eye_y = None
        
        # Calculate average gaze point for eye_aoi detection
        if left_eye_x is not None and right_eye_x is not None:
            gaze_x = int((left_eye_x + right_eye_x) / 2)
            gaze_y = int((left_eye_y + right_eye_y) / 2)
        elif left_eye_x is not None:
            gaze_x = left_eye_x
            gaze_y = left_eye_y
        elif right_eye_x is not None:
            gaze_x = right_eye_x
            gaze_y = right_eye_y
        else:
            # No valid gaze data
            return
        
        # Calculate offset_ms from session start
        current_time = time.time()
        offset_ms = int((current_time - session_start_time) * 1000) if session_start_time else 0
        
        # Create timestamp
        timestamp_iso = datetime.utcnow().isoformat() + 'Z'
        
        # Prepare payload for API
        payload = {
            "session_id": SESSION_ID,
            "event_type": "eye_gaze",
            "timestamp_iso": timestamp_iso,
            "offset_ms": offset_ms,
            "key": "",
            "page": "",  # Will be set by frontend if needed
            "coordinates": {
                "x": gaze_x,
                "y": gaze_y
            },
            "mouse_aoi": "",  # Eye gaze doesn't have mouse AOI
            "description": "Eye gaze sample",
            "mouse_click": False,
            "text_input": False,
            "text_activity": "",
            "targetId": "",
            "eye_aoi": "",  # Can be calculated on frontend if needed
            "left_eye_x": left_eye_x if left_eye_x is not None else "",
            "left_eye_y": left_eye_y if left_eye_y is not None else "",
            "right_eye_x": right_eye_x if right_eye_x is not None else "",
            "right_eye_y": right_eye_y if right_eye_y is not None else "",
            "aoi_top_left_x": "",
            "aoi_top_left_y": "",
            "aoi_bottom_right_x": "",
            "aoi_bottom_right_y": ""
        }
        
        # Send to API
        try:
            response = requests.post(
                f"{API_BASE}/api/aoi_event",
                json=payload,
                timeout=0.1  # Non-blocking, don't wait for response
            )
            if response.status_code != 200:
                print(f"Warning: API returned status {response.status_code}")
        except requests.exceptions.RequestException as e:
            # Silently handle errors to avoid blocking gaze collection
            pass
            
    except Exception as e:
        print(f"Error processing gaze data: {e}")

def start_collection(session_id, screen_width=1920, screen_height=1080):
    """Start collecting gaze data for a session"""
    global is_collecting, session_start_time, SESSION_ID, SCREEN_WIDTH, SCREEN_HEIGHT
    
    if eyetracker is None:
        print("Error: Eye tracker not initialized")
        return False
    
    SESSION_ID = session_id
    SCREEN_WIDTH = screen_width
    SCREEN_HEIGHT = screen_height
    session_start_time = time.time()
    is_collecting = True
    
    # Subscribe to gaze data
    eyetracker.subscribe_to(tr.EYETRACKER_GAZE_DATA, gaze_data_callback, as_dictionary=False)
    print(f"Started collecting gaze data for session: {session_id}")
    print(f"Screen resolution: {screen_width}x{screen_height}")
    return True

def stop_collection():
    """Stop collecting gaze data"""
    global is_collecting
    
    if eyetracker is None:
        return
    
    if is_collecting:
        try:
            eyetracker.unsubscribe_from(tr.EYETRACKER_GAZE_DATA, gaze_data_callback)
        except Exception as e:
            # If callback-based unsubscribe fails, try without callback
            try:
                eyetracker.unsubscribe_from(tr.EYETRACKER_GAZE_DATA)
            except Exception as e2:
                print(f"Warning: Error unsubscribing from gaze data: {e2}")
        is_collecting = False
        print("Stopped collecting gaze data")

def main():
    """Main function - can be run as standalone script or imported as module"""
    global SESSION_ID
    
    # Check for test mode
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        # Test mode: just check if device is available
        print("Testing Tobii eye tracker connection...")
        if find_eyetracker():
            print("✓ Tobii eye tracker found and ready!")
            sys.exit(0)
        else:
            print("✗ No Tobii eye tracker found")
            sys.exit(1)
    
    # Find eye tracker
    if not find_eyetracker():
        print("Failed to find eye tracker. Exiting.")
        sys.exit(1)
    
    # Check if session_id provided as command line argument
    if len(sys.argv) > 1:
        SESSION_ID = sys.argv[1]
        screen_width = int(sys.argv[2]) if len(sys.argv) > 2 else 1920
        screen_height = int(sys.argv[3]) if len(sys.argv) > 3 else 1080
        
        print(f"Starting collection for session: {SESSION_ID}")
        start_collection(SESSION_ID, screen_width, screen_height)
        
        try:
            # Keep running until interrupted
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping collection...")
            stop_collection()
    else:
        print("Tobii Eye Tracker service ready.")
        print("Usage: python tobii_eye_tracker.py <session_id> [screen_width] [screen_height]")
        print("Or use the HTTP API endpoints to control collection.")
        print("Test mode: python tobii_eye_tracker.py --test")

if __name__ == "__main__":
    main()

