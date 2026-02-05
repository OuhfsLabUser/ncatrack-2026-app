// api/index.js
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execFile } from 'child_process';

import casesRouter from './routes/cases.js';
import peopleRouter from './routes/people.js';
import agenciesRouter from './routes/agencies.js';
import employeesRouter from './routes/employee.js';
import mentalhealthRouter from './routes/mentalhealth.js';
import victimsAdvocacyRouter from './routes/victimadvocacy.js';
import caseSearchRoutes from './routes/case-search.js';
import picklistsRouter from './routes/picklists.js';
import vaLogRouter from './routes/va-log.js';
import exportRouter from './routes/export.js';
import scenariosRouter from './routes/scenarios.js';
import eyeTrackerRouter from './routes/eye_tracker.js';

// ———————— ESM __dirname shim —————————
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
// ——————————————————————————————————————————

// Configure Prisma with Dallas timezone
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Set timezone to Dallas (America/Chicago) for database connections
// Note: This should be set at the database level, but we ensure consistency here
process.env.TZ = 'America/Chicago';

const app = express();

// Toggle via env var:
//    ENABLE_AOI_LOGGING=false node index.js
const ENABLE_AOI_LOGGING = process.env.ENABLE_AOI_LOGGING !== 'false';
console.log(`AOI logging is ${ENABLE_AOI_LOGGING ? 'ENABLED' : 'DISABLED'}`);

// Prepare main log directory
const logDir = path.resolve(process.cwd(), 'AOI log');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Session file mapping: session_id -> file path
const sessionFiles = new Map();
// Current active session ID (for export)
let currentSessionId = null;

// Helper function to create timestamp string
const pad = (n) => n.toString().padStart(2, '0');
const createTimestamp = () => {
  const now = new Date();
  return (
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('') +
    '_' +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('')
  );
};

// MAIN APP HEADER: added offset_ms, key, description, and AOI coordinates
const mainAppHeader = [
  'timestamp_iso',
  'offset_ms',
  'key',
  'page',
  'mouse_x',
  'mouse_y',
  'mouse_aoi',
  'aoi_top_left_x',
  'aoi_top_left_y',
  'aoi_bottom_right_x',
  'aoi_bottom_right_y',
  'description',
  'mouse_click',
  'eye_aoi',
  'left_eye_x',
  'left_eye_y',
  'right_eye_x',
  'right_eye_y',
].join(',') + '\n';


/* ─── TASK-APP LOG SETUP ────────────────────────────────────────────────── */
// Prepare a separate folder & CSV for the task-app AOI data
const taskLogDir = path.join(logDir, 'task-app');
if (!fs.existsSync(taskLogDir)) fs.mkdirSync(taskLogDir, { recursive: true });

// TASK APP HEADER: also includes offset_ms and key
const taskAppHeader = [
  'timestamp_iso',
  'offset_ms',
  'key',
  'mouse_x',
  'mouse_y',
  'mouse_aoi',
  'mouse_click',
  'text_input',
  'text_activity',
  'targetId',
  'description',
  'eye_aoi',
  'left_eye_x',
  'left_eye_y',
  'right_eye_x',
  'right_eye_y'
].join(',') + '\n';
/* ──────────────────────────────────────────────────────────────────────────── */

app.use(express.json());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// inject prisma
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// existing routes
app.use('/api/cases', casesRouter);
app.use('/api/people', peopleRouter);
app.use('/api/agencies', agenciesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/mentalhealth', mentalhealthRouter);
app.use('/api/va', victimsAdvocacyRouter);
app.use('/api/va-log', vaLogRouter);
app.use('/api/case-search', caseSearchRoutes);
app.use('/api/picklists', picklistsRouter);
app.use('/api/export', exportRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/eye_tracker', eyeTrackerRouter);

// ─── MAIN APP AOI ENDPOINT ────────────────────────────────────────────────
app.post('/api/aoi_event', async (req, res) => {
  try {
    const {
      session_id,
      event_type,
      page           = '',
      timestamp_iso  = '',
      offset_ms      = '',
      key            = '',
      coordinates    = {},
      mouse_aoi      = '',
      description    = '',
      mouse_click    = false,
      eye_aoi        = '',
      left_eye_x     = '',
      left_eye_y     = '',
      right_eye_x    = '',
      right_eye_y    = '',
      aoi_top_left_x = '',
      aoi_top_left_y = '',
      aoi_bottom_right_x = '',
      aoi_bottom_right_y = '',
    } = req.body;

    if (!ENABLE_AOI_LOGGING || !session_id) {
      return res.status(200).json({ message: 'Logging disabled or missing session_id' });
    }

    // Handle session_start: create new log file for this session
    if (event_type === 'session_start') {
      const ts = createTimestamp();
      const fileName = `${session_id}_${ts}.csv`;
      const filePath = path.join(logDir, fileName);
      
      // Write header to new file
      fs.writeFileSync(filePath, mainAppHeader);
      sessionFiles.set(session_id, filePath);
      currentSessionId = session_id;
      
      console.log(`Session ${session_id} started. Log file: ${fileName}`);
      return res.json({ 
        message: 'Session started',
        session_id: session_id,
        log_file: fileName
      });
    }

    // Handle session_end: mark session as ended
    if (event_type === 'session_end') {
      console.log(`Session ${session_id} ended.`);
      // Keep the file in sessionFiles for export, but mark session as inactive
      return res.json({ message: 'Session ended' });
    }

    // Get file path for this session
    let filePath = sessionFiles.get(session_id);
    if (!filePath) {
      // If file doesn't exist, create it (backward compatibility)
      const ts = createTimestamp();
      const fileName = `${session_id}_${ts}.csv`;
      filePath = path.join(logDir, fileName);
      fs.writeFileSync(filePath, mainAppHeader);
      sessionFiles.set(session_id, filePath);
      currentSessionId = session_id;
      console.log(`Created log file for session ${session_id}: ${fileName}`);
    }

    const x   = coordinates.x ?? '';
    const y   = coordinates.y ?? '';
    const esc = (s) => String(s).replace(/,/g, ';');

    const line = [
      timestamp_iso,
      offset_ms,
      `"${esc(key)}"`,
      `"${esc(page)}"`,
      x,
      y,
      `"${esc(mouse_aoi)}"`,
      aoi_top_left_x || '',
      aoi_top_left_y || '',
      aoi_bottom_right_x || '',
      aoi_bottom_right_y || '',
      `"${esc(description)}"`,
      mouse_click,
      `"${esc(eye_aoi)}"`,
      left_eye_x,
      left_eye_y,
      right_eye_x,
      right_eye_y
    ].join(',') + '\n';

    fs.appendFile(filePath, line, err => {
      if (err) console.error('Error writing AOI event:', err);
    });

    console.log('AOI event received:', req.body);
    res.status(200).json({ message: 'Event received' });
  } catch (err) {
    console.error('Error in /api/aoi_event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Session file mapping for task-app: session_id -> file path
const taskSessionFiles = new Map();

// ─── TASK APP AOI ENDPOINT ────────────────────────────────────────────────
app.post('/api/task_aoi_event', async (req, res) => {
  try {
    const {
      session_id,
      event_type,
      timestamp_iso = '',
      offset_ms     = '',
      key           = '',
      coordinates   = {},
      mouse_aoi     = '',
      mouse_click   = false,
      text_input    = false,
      text_activity = '',
      targetId      = '',
      description   = '',
      eye_aoi       = '',
      left_eye_x    = '',
      left_eye_y    = '',
      right_eye_x   = '',
      right_eye_y   = '',
    } = req.body;

    if (!session_id) {
      return res.status(200).json({ message: 'Missing session_id' });
    }

    // Handle session_start: create new log file for this session
    if (event_type === 'session_start') {
      const ts = createTimestamp();
      const fileName = `task_${session_id}_${ts}.csv`;
      const filePath = path.join(taskLogDir, fileName);
      
      // Write header to new file
      fs.writeFileSync(filePath, taskAppHeader);
      taskSessionFiles.set(session_id, filePath);
      
      console.log(`Task session ${session_id} started. Log file: ${fileName}`);
      return res.json({ 
        message: 'Task session started',
        session_id: session_id,
        log_file: fileName
      });
    }

    // Handle session_end: mark session as ended
    if (event_type === 'session_end') {
      console.log(`Task session ${session_id} ended.`);
      return res.json({ message: 'Task session ended' });
    }

    // Get file path for this session
    let filePath = taskSessionFiles.get(session_id);
    if (!filePath) {
      // If file doesn't exist, create it (backward compatibility)
      const ts = createTimestamp();
      const fileName = `task_${session_id}_${ts}.csv`;
      filePath = path.join(taskLogDir, fileName);
      fs.writeFileSync(filePath, taskAppHeader);
      taskSessionFiles.set(session_id, filePath);
      console.log(`Created task log file for session ${session_id}: ${fileName}`);
    }

    const x   = coordinates.x ?? '';
    const y   = coordinates.y ?? '';
    const esc = (s) => String(s).replace(/,/g, ';');

    const line = [
      timestamp_iso,
      offset_ms,
      `"${esc(key)}"`,
      x,
      y,
      `"${esc(mouse_aoi)}"`,
      mouse_click,
      text_input,
      `"${esc(text_activity)}"`,
      targetId,
      description,
      `"${esc(eye_aoi)}"`,
      left_eye_x,
      left_eye_y,
      right_eye_x,
      right_eye_y
    ].join(',') + '\n';

    fs.appendFileSync(filePath, line);

    console.log('TASK AOI event received:', req.body);
    res.status(200).json({ message: 'Task event received' });
  } catch (err) {
    console.error('Error in /api/task_aoi_event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET CURRENT SESSION ID (for export) ──────────────────────────────────
app.get('/api/aoi_event/current_session', (req, res) => {
  res.json({ 
    session_id: currentSessionId,
    has_session: currentSessionId !== null
  });
});

// health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── PYTHON SMOKE-TEST ENDPOINT ─────────────────────────────────────────────
app.get('/api/python_test', (req, res) => {
  const script = path.join(__dirname, 'test_script.py');
  execFile('python3', [ script ], (err, stdout, stderr) => {
    if (err) {
      console.error('Python test error:', stderr);
      return res.status(500).json({ status: 'error', error: stderr });
    }
    res.json({ status: 'ok', message: stdout.trim() });
  });
});
// ────────────────────────────────────────────────────────────────────────────

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

// graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
