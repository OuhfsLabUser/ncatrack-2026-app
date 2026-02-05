// src/useAOILogging.js
import { useCallback } from 'react';
const BASE = 'http://localhost:5000';

export default function useAOILogging(tabName) {
  return useCallback((eventType, extra = {}) => {
    const session_id = localStorage.getItem('aoi_session_id');
    const payload = {
      session_id,
      event_type: eventType,
      tab: tabName,
      ...extra
    };

    fetch(`${BASE}/api/aoi_event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.error('AOI logging error:', err);
    });
  }, [tabName]);
}
