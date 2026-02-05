// src/components/EyeTracker.js
import { useEffect } from 'react';
import useAOILogging from '../useAOILogging';

export default function EyeTracker() {
  const logEvent = useAOILogging('EyeTracker');

  useEffect(() => {
    const wg = window.webgazer;

    wg.setRegression('ridge');
    wg.showPredictionPoints(true);
    wg.showFaceOverlay(false);
    wg.showFaceFeedbackBox(false);

    wg.setGazeListener((data, timestamp) => {
      if (!data) return;
      const { x, y } = data;

      // figure out which AOI the eyes are in at that moment
      const eyeEl = document.elementFromPoint(x, y);
      const eye_aoi = eyeEl?.getAttribute('data-aoi') || '';

      // if you ever have left/right eye coords from your hardware you’d fill them here
      // for WebGazer we’ll just duplicate the same value into both columns:
      logEvent('gaze_sample', {
        coordinates: { x, y },
        mouse_click: false,
        mouse_aoi: '',            // no mouse change here
        eye_aoi,
        left_eye_x: x.toFixed(0), // round to integer if you prefer
        left_eye_y: y.toFixed(0),
        right_eye_x: x.toFixed(0),
        right_eye_y: y.toFixed(0),
      });
    });

    wg.begin();

    return () => {
      wg.clearGazeListener();
      wg.pause();
    };
  }, [logEvent]);

  return null;
}
