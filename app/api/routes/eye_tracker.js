// routes/eye_tracker.js
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Store running eye tracker processes by session_id
const eyeTrackerProcesses = new Map();

// Start eye tracker for a session
router.post('/start', (req, res) => {
  try {
    const { session_id, screen_width = 1920, screen_height = 1080 } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    
    // Check if already running for this session
    if (eyeTrackerProcesses.has(session_id)) {
      return res.status(400).json({ error: 'Eye tracker already running for this session' });
    }
    
    // Path to Python script
    const scriptPath = path.join(__dirname, '..', 'tobii_eye_tracker.py');
    
    // Try to use Python 3.10 (required for tobii-research)
    // Try py -3.10 first (Windows Python Launcher), then python3.10, then python
    const pythonCommands = ['py', '-3.10', 'python3.10', 'python'];
    let pythonCmd = 'python';
    let pythonArgs = [scriptPath, session_id, screen_width.toString(), screen_height.toString()];
    
    // On Windows, try py -3.10 first
    if (process.platform === 'win32') {
      pythonCmd = 'py';
      pythonArgs = ['-3.10', scriptPath, session_id, screen_width.toString(), screen_height.toString()];
    }
    
    // Spawn Python process
    const pythonProcess = spawn(pythonCmd, pythonArgs, {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Handle output
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Print all output to see detailed information
      const lines = output.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`[Tobii Eye Tracker ${session_id}]: ${line}`);
      });
      
      // Log key startup info
      if (output.includes('Serial Number:')) {
        // Extract serial number
        const snMatch = output.match(/Serial Number:\s*([^\n]+)/);
        if (snMatch) {
          console.log(`✓✓✓ Tobii Serial Number detected: ${snMatch[1].trim()}`);
        }
      }
      if (output.includes('Found') && output.includes('eye tracker')) {
        console.log(`✓ Tobii device found for session ${session_id}`);
      }
      if (output.includes('SUCCESS: Started collecting')) {
        console.log(`✓✓✓ Gaze data collection started successfully for session ${session_id}`);
      }
      if (output.includes('Failed to find eye tracker') || output.includes('No eye trackers found')) {
        console.error(`✗ Tobii eye tracker not found for session ${session_id}`);
      }
      if (output.includes('ERROR') || output.includes('Error')) {
        console.error(`✗ Error detected in Tobii process: ${output}`);
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[Tobii Eye Tracker ${session_id} Error]: ${error}`);
      
      // Log common errors
      if (error.includes('No module named') || error.includes('ModuleNotFoundError')) {
        console.error(`✗ Python dependencies missing for session ${session_id}. Please install: pip install -r requirements_tobii.txt`);
      }
    });
    
    // Handle process exit
    pythonProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(`[Tobii Eye Tracker ${session_id}] Process exited normally`);
      } else {
        console.error(`[Tobii Eye Tracker ${session_id}] Process exited with error code ${code}`);
        console.error(`This usually means: Tobii device not found or Python dependencies missing`);
      }
      eyeTrackerProcesses.delete(session_id);
    });
    
    // Store process immediately (will be cleaned up on exit if it fails)
    eyeTrackerProcesses.set(session_id, pythonProcess);
    
    console.log(`Started Tobii eye tracker process for session: ${session_id}`);
    res.json({ 
      success: true, 
      message: 'Eye tracker process started',
      session_id: session_id,
      note: 'Check server logs to confirm device connection'
    });
  } catch (error) {
    console.error('Error starting eye tracker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop eye tracker for a session
router.post('/stop', (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    
    const process = eyeTrackerProcesses.get(session_id);
    if (!process) {
      return res.status(404).json({ error: 'No eye tracker running for this session' });
    }
    
    // Kill the process
    process.kill();
    eyeTrackerProcesses.delete(session_id);
    
    console.log(`Stopped Tobii eye tracker for session: ${session_id}`);
    res.json({ 
      success: true, 
      message: 'Eye tracker stopped',
      session_id: session_id 
    });
  } catch (error) {
    console.error('Error stopping eye tracker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get status of eye tracker
router.get('/status/:session_id', (req, res) => {
  try {
    const { session_id } = req.params;
    const isRunning = eyeTrackerProcesses.has(session_id);
    
    res.json({
      session_id: session_id,
      is_running: isRunning
    });
  } catch (error) {
    console.error('Error getting eye tracker status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Tobii device connection (without starting collection)
router.get('/test', (req, res) => {
  const scriptPath = path.join(__dirname, '..', 'tobii_eye_tracker.py');
  
  // Try to use Python 3.10 (required for tobii-research)
  let pythonCmd = 'python';
  let pythonArgs = [scriptPath, '--test'];
  
  // On Windows, try py -3.10 first
  if (process.platform === 'win32') {
    pythonCmd = 'py';
    pythonArgs = ['-3.10', scriptPath, '--test'];
  }
  
  // Run Python script with a test flag
  const pythonProcess = spawn(pythonCmd, pythonArgs, {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let output = '';
  let errorOutput = '';
  
  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  pythonProcess.on('exit', (code) => {
    const hasDevice = output.includes('Found eye tracker') || output.includes('eye tracker');
    const hasError = errorOutput.includes('No module named') || errorOutput.includes('ModuleNotFoundError');
    
    res.json({
      success: code === 0 && hasDevice,
      exit_code: code,
      output: output,
      error: errorOutput,
      device_found: hasDevice,
      dependencies_installed: !hasError,
      message: hasDevice 
        ? 'Tobii device found and ready' 
        : hasError 
          ? 'Python dependencies missing. Run: pip install -r requirements_tobii.txt'
          : 'Tobii device not found. Please check connection.'
    });
  });
  
  // Timeout after 5 seconds
  setTimeout(() => {
    if (!pythonProcess.killed) {
      pythonProcess.kill();
      if (!res.headersSent) {
        res.json({
          success: false,
          message: 'Test timeout - check if Python script is hanging'
        });
      }
    }
  }, 5000);
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('Stopping all eye tracker processes...');
  eyeTrackerProcesses.forEach((process, session_id) => {
    process.kill();
    console.log(`Stopped eye tracker for session: ${session_id}`);
  });
  eyeTrackerProcesses.clear();
});

export default router;

