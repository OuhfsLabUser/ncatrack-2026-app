// script.js

// Base URL for your AOI logging API
const AOI_BASE = 'http://localhost:5000';

// Randomly shuffle PDFs for the 10 tasks
const pdfOrder = Array.from({ length: 10 }, (_, i) => i + 1)
  .sort(() => Math.random() - 0.5);
console.log('PDF order:', pdfOrder);

document.addEventListener('DOMContentLoaded', () => {
  try {
    // ─── AOI TRACKING SETUP ───────────────────────────────────────────────

    // Generate a session ID
    const sessionId = crypto.randomUUID();
    window.AOI_SESSION_ID = sessionId;

    // Mouse & gaze state
    const mouse = { x: 0, y: 0, aoi: '' };
    const gaze  = { x: 0, y: 0, eyeAoi: '', leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    const firstEventTime = { current: null }; // Track first event time for offset_ms

    const clamp = (v, max) => Math.min(Math.max(Math.round(v), 0), max);
    const getAOI = (x, y) => 
      document.elementFromPoint(x, y)?.getAttribute('data-aoi') || '';

    // Initialize WebGazer
    if (!window.webgazer) throw new Error('webgazer.js failed to load');
    webgazer
      .setRegression('ridge')
      .showPredictionPoints(false)
      .showVideoPreview(false)         // ← explicitly show the video feed
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false)
      .setGazeListener((data) => {
        if (!data) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const gx = clamp(data.x, vw), gy = clamp(data.y, vh);
        gaze.x      = gx;
        gaze.y      = gy;
        gaze.eyeAoi = getAOI(gx, gy);
        gaze.leftX  = clamp(data.xLeft  ?? gx, vw);
        gaze.leftY  = clamp(data.yLeft  ?? gy, vh);
        gaze.rightX = clamp(data.xRight ?? gx, vw);
        gaze.rightY = clamp(data.yRight ?? gy, vh);
      });

    webgazer.begin();

    // Unified event sender
    async function sendEvent({
      eventType,
      isClick     = false,
      textInput   = false,
      activity    = '',
      targetId    = '',
      description = '',
      key         = ''
    }) {
      const nowMs = Date.now();
      // Initialize firstEventTime on very first call
      if (firstEventTime.current === null) {
        firstEventTime.current = nowMs;
      }
      const offsetMs = nowMs - firstEventTime.current;

      const nowIso = new Date(nowMs).toISOString();
      const page = window.location.pathname;
      const payload = {
        session_id:    sessionId,
        event_type:    eventType,
        page,
        timestamp_iso: nowIso,
        offset_ms:     offsetMs,
        key,           // Individual key logged
        coordinates:   { x: mouse.x, y: mouse.y },
        mouse_aoi:     mouse.aoi,
        mouse_click:   isClick,
        text_input:    textInput,
        text_activity: activity,
        targetId,
        description,
        eye_aoi:       gaze.eyeAoi,
        left_eye_x:    gaze.leftX,
        left_eye_y:    gaze.leftY,
        right_eye_x:   gaze.rightX,
        right_eye_y:   gaze.rightY
      };
      try {
        await fetch(`${AOI_BASE}/api/task_aoi_event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('AOI log failed:', err);
      }
    }

    // Mouse move & click with throttling for performance
    let mouseMoveThrottle = null;
    function onMouseMove(e) {
      mouse.x   = e.clientX;
      mouse.y   = e.clientY;
      mouse.aoi = getAOI(e.clientX, e.clientY);
    }
    
    // Throttled mouse move handler (100ms throttle)
    function onMouseMoveThrottled(e) {
      onMouseMove(e);
      if (mouseMoveThrottle === null) {
        mouseMoveThrottle = setTimeout(() => {
          mouseMoveThrottle = null;
        }, 100);
      }
    }
    
    function onClick(e) {
      onMouseMove(e);
      sendEvent({ eventType: 'click', isClick: true });
    }
    window.addEventListener('mousemove', onMouseMoveThrottled);
    window.addEventListener('click',     onClick);

    // 1s sampling
    const samplerId = setInterval(() => sendEvent({ eventType: 'sample' }), 1000);

    // Text‐input listener
    function onInput(e) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        sendEvent({
          eventType:   'text_input',
          textInput:   true,
          activity:    e.data ?? e.target.value,
          targetId:    e.target.id || e.target.name,
        });
      }
    }
    
    // Key-press listener
    function onKeyDown(e) {
      sendEvent({
        eventType: 'key_press',
        key:       e.key,
        targetId:  e.target.id || e.target.name
      });
    }
    
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKeyDown);

    // Cleanup
    function cleanup() {
      clearInterval(samplerId);
      if (mouseMoveThrottle) {
        clearTimeout(mouseMoveThrottle);
        mouseMoveThrottle = null;
      }
      window.removeEventListener('mousemove', onMouseMoveThrottled);
      window.removeEventListener('click',     onClick);
      document.removeEventListener('input',   onInput);
      document.removeEventListener('keydown', onKeyDown);
      webgazer.clearGazeListener();
      webgazer.pause();
    }
    window.addEventListener('beforeunload', cleanup);

    // ─── END AOI SETUP ──────────────────────────────────────────────────


    // ─── TASK APP LOGIC ────────────────────────────────────────────────

    const buttons      = document.querySelectorAll('.button');
    const tasks        = document.querySelectorAll('.sidebar a');
    const instructions = document.getElementById('instrxns');
    const pdfViewer    = document.querySelector('.pdf-viewer');

    let interactionLocked = false;
    let currentTask       = 1;
    let maxTaskReached    = 1;

    // Lock after 60 minutes
    setTimeout(() => {
      interactionLocked = true;
      buttons.forEach(b => b.style.opacity = 0.5);
      tasks.forEach(t   => t.style.opacity = 0.5);
      alert("60 minutes elapsed. Study is over.");
    }, 60 * 60 * 1000);

    function updateTask() {
      tasks.forEach((task, i) => {
        const num = i + 1;
        task.classList.toggle('current-task', num === currentTask);
        if (num < maxTaskReached) task.style.opacity = 0.5;
      });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (interactionLocked) return;
        if (btn.textContent === 'Next') {
          if (currentTask < 10) {
            currentTask++;
            maxTaskReached = Math.max(maxTaskReached, currentTask);
            updateTask();
            instructions.textContent = `Please read the instructions for Task ${currentTask} carefully before proceeding.`;
            pdfViewer.src = `${pdfOrder[currentTask - 1]}.pdf`;
            if (currentTask === 10) btn.style.display = 'none';
          }
        } else if (btn.textContent === 'Finished') {
          alert(currentTask === 10 ? 'Finished!' : 'Complete then Next.');
        }
      });
    });

    tasks.forEach((task, i) => {
      task.addEventListener('click', (e) => {
        if (interactionLocked) return;
        e.preventDefault();
        const num = i + 1;
        if (num >= maxTaskReached) {
          currentTask = num;
          instructions.textContent = `Please read the instructions for Task ${num} carefully before proceeding.`;
          pdfViewer.src = `${pdfOrder[num - 1]}.pdf`;
          updateTask();
        }
      });
    });

    updateTask();

  } catch (err) {
    console.error('Task‐app init error:', err);
    alert('Initialization error—check console.');
  }
});

// Start‐button handler
function startTasks() {
  document.querySelector('.start-page').style.display   = 'none';
  document.querySelector('.container').style.display    = 'flex';
  document.querySelector('#instrxns').textContent      = 'Read instructions before proceeding.';
  document.querySelector('.pdf-viewer').src            = `${pdfOrder[0]}.pdf`;
  document.querySelector('.sidebar').style.display     = 'block';
}
