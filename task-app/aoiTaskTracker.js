// task-app/aoiTaskTracker.js
(function(){
    const BASE = 'http://localhost:5000';
    const sessionId = localStorage.getItem('AOI_TASK_SESSION') || crypto.randomUUID();
    localStorage.setItem('AOI_TASK_SESSION', sessionId);
  
    const mouse = { x:0, y:0, aoi:'' };
    const gaze  = { x:0, y:0, eyeAoi:'', leftX:0, leftY:0, rightX:0, rightY:0 };
    const firstEventTime = { current: null }; // Track first event time for offset_ms
  
    const clamp = (v,max)=>Math.min(Math.max(Math.round(v),0),max);
    const getAOI = (x,y)=> document.elementFromPoint(x,y)?.getAttribute('data-aoi')||'';
  
    // WebGazer
    webgazer.setRegression('ridge')
            .showPredictionPoints(false)
            .showFaceOverlay(false)
            .showFaceFeedbackBox(false)
            .setGazeListener(data=>{
              if(!data) return;
              const vw=innerWidth, vh=innerHeight;
              const gx=clamp(data.x,vw), gy=clamp(data.y,vh);
              gaze.x=gx; gaze.y=gy;
              gaze.eyeAoi = getAOI(gx,gy);
              gaze.leftX  = clamp(data.xLeft  ?? gx, vw);
              gaze.leftY  = clamp(data.yLeft  ?? gy, vh);
              gaze.rightX = clamp(data.xRight ?? gx, vw);
              gaze.rightY = clamp(data.yRight ?? gy, vh);
            })
            .begin();
  
    // Send helper
    async function sendEvent({
      eventType, isClick=false, textInput=false,
      activity='', targetId='', description='', key=''
    }){
      const nowMs = Date.now();
      // Initialize firstEventTime on very first call
      if (firstEventTime.current === null) {
        firstEventTime.current = nowMs;
      }
      const offsetMs = nowMs - firstEventTime.current;

      const nowIso = new Date(nowMs).toISOString();
      const payload = {
        session_id: sessionId,
        event_type: eventType,
        timestamp_iso: nowIso,
        offset_ms: offsetMs,
        key, // Individual key logged
        coordinates: { x: mouse.x, y: mouse.y },
        mouse_aoi: mouse.aoi,
        mouse_click: isClick,
        text_input: textInput,
        text_activity: activity,
        targetId, description,
        eye_aoi: gaze.eyeAoi,
        left_eye_x: gaze.leftX, left_eye_y: gaze.leftY,
        right_eye_x: gaze.rightX, right_eye_y: gaze.rightY
      };
      try {
        await fetch(`${BASE}/api/task_aoi_event`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
      } catch(e){
        console.error('Task AOI send failed', e);
      }
    }
  
    // Mouse + click with throttling for performance
    let mouseMoveThrottle = null;
    function onMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.aoi = getAOI(mouse.x, mouse.y);
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
      sendEvent({ eventType:'click', isClick:true });
    }
    
    document.addEventListener('mousemove', onMouseMoveThrottled);
    document.addEventListener('click', onClick);
  
    // 1s sampling
    setInterval(()=> sendEvent({ eventType:'sample' }), 1000);
  
    // Text input
    function onInput(e) {
      if(e.target.matches('input, textarea')){
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
  
    // Cleanup on unload
    function cleanup() {
      if (mouseMoveThrottle) {
        clearTimeout(mouseMoveThrottle);
        mouseMoveThrottle = null;
      }
      document.removeEventListener('mousemove', onMouseMoveThrottled);
      document.removeEventListener('click', onClick);
      document.removeEventListener('input', onInput);
      document.removeEventListener('keydown', onKeyDown);
      webgazer.clearGazeListener();
      webgazer.pause();
    }
    
    window.addEventListener('beforeunload', cleanup);
  })();
  