import express from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// UTF-8 BOM so Excel opens CSV as UTF-8 (avoids "â€"" for en dash, Chinese, etc.)
const UTF8_BOM = '\uFEFF';

// Helper function to convert data to CSV format
function convertToCSV(data, columns) {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const header = columns.join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// Strip UTF-8 BOM from string (CSV files are written with BOM; first column would otherwise be "\uFEFFtimestamp_iso")
function stripBOM(s) {
  return (s && s.length > 0 && s.charCodeAt(0) === 0xFEFF) ? s.slice(1) : (s || '');
}

// Format milliseconds to human-readable time (e.g., "1min25s", "45s")
function formatTime(ms) {
  if (ms < 0 || ms === null || ms === undefined || ms === '') return '';
  const totalSeconds = Math.floor(Number(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}min${seconds}s`;
  }
  return `${seconds}s`;
}

// Parse ISO timestamp to milliseconds (for calculating elapsed time)
function parseTimestampToMs(timestamp) {
  if (!timestamp || timestamp === '') return null;
  try {
    return new Date(timestamp).getTime();
  } catch (e) {
    return null;
  }
}

// Ensure time_indicator is in the second column (index 1) for CSV files
// Returns { header, processRow } where processRow(rowValues) adds/updates time_indicator
function ensureTimeIndicatorInSecondColumn(originalHeader, startTimeMs) {
  const header = [...originalHeader];
  const timeIndicatorIndex = header.indexOf('time_indicator');
  const timestampIndex = header.indexOf('timestamp_iso');
  
  // Remove time_indicator if it exists elsewhere
  if (timeIndicatorIndex !== -1 && timeIndicatorIndex !== 1) {
    header.splice(timeIndicatorIndex, 1);
  }
  
  // Insert time_indicator at index 1 (second column) if not already there
  if (timeIndicatorIndex !== 1) {
    header.splice(1, 0, 'time_indicator');
  }
  
  // Function to process a row and ensure time_indicator is in second column
  const processRow = (rowValues, timestamp, offset) => {
    const values = [...rowValues];
    let readableTime = '';
    
    // Calculate readable time
    if (startTimeMs !== null) {
      if (timestamp) {
        const currentTimeMs = parseTimestampToMs(timestamp);
        if (currentTimeMs !== null) {
          const elapsedMs = currentTimeMs - startTimeMs;
          readableTime = formatTime(elapsedMs);
        }
      } else if (offset) {
        readableTime = formatTime(Number(offset));
      }
    }
    
    // Remove time_indicator if it exists elsewhere
    const origTimeIndicatorIdx = originalHeader.indexOf('time_indicator');
    if (origTimeIndicatorIdx !== -1 && origTimeIndicatorIdx !== 1) {
      values.splice(origTimeIndicatorIdx, 1);
    }
    
    // Insert time_indicator at index 1
    if (origTimeIndicatorIdx !== 1) {
      values.splice(1, 0, readableTime);
    } else {
      values[1] = readableTime;
    }
    
    return values;
  };
  
  return { header, processRow };
}

// Derive large AOI (first segment before " > ") for summary/grouping
function toLargeAoi(aoi) {
  if (!aoi || typeof aoi !== 'string') return '';
  const trimmed = aoi.trim();
  const idx = trimmed.indexOf(' > ');
  return idx >= 0 ? trimmed.slice(0, idx).trim() : trimmed;
}

// Text input descriptions that create 0-second segments; exclude from raw_data, mouse_data, and mouse summary
function isTextInputDescription(desc) {
  if (!desc || typeof desc !== 'string') return false;
  const t = desc.trim();
  return t === 'Text input' || t.startsWith('Text input in ');
}

// Helper function to parse CSV line (handles quoted values)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  return result;
}

// Build summary rows from an array of events (mouse/interaction only; used for AOI summary and mouse summary).
// Events must be sorted by offset/timestamp before calling. Returns array of summary row objects.
function buildSummaryFromEvents(events) {
  if (!events || events.length === 0) return [];
  const summaryData = [];
  const MAX_GAP_MS = 5000;
  const MAX_KEYBOARD_SEQUENCE_MS = 2000;

  const extractKey = (event) => {
    if (event.key && event.key.trim()) return event.key.trim();
    const match = event.description.match(/['"]([^'"]+)['"]|(Backspace|Delete|Enter|Tab|Space)/i);
    if (match) {
      if (match[1]) return match[1];
      if (match[2]) return match[2];
    }
    const colonMatch = event.description.split(':');
    if (colonMatch.length > 1) {
      const keyPart = colonMatch[colonMatch.length - 1].trim();
      return keyPart.replace(/\s*\([^)]*\)\s*$/, '').trim() || '';
    }
    return '';
  };
  const isKeyboardInput = (event) =>
    event.description.includes('Key pressed') || event.description.includes('key_press') || (event.key && event.key.trim() !== '');
  const isInputSequence = (event) =>
    event.event_type === 'input_sequence' || event.description.includes('Input sequence');
  const isCharacter = (key) =>
    key && key.length === 1 && !['Backspace', 'Delete', 'Enter', 'Tab', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
  const isBackspaceOrDelete = (key) => {
    if (!key) return false;
    const keyLower = key.toLowerCase();
    return keyLower === 'backspace' || keyLower === 'delete' || key === '←' || key.includes('Backspace') || key.includes('Delete');
  };

  // Helper to flush current group into summaryData
  const saveGroup = (group) => {
    if (!group || !group.events || group.events.length === 0) return;
    const startTime = group.events[0].timestamp;
    const endTime = group.events[group.events.length - 1].timestamp;
    const startOffset = group.events[0].offset;
    const endOffset = group.events[group.events.length - 1].offset;
    const duration = (endOffset !== null && startOffset !== null) ? (endOffset - startOffset) : null;
    let finalDescription = group.description;
    let shouldSkip = false;

    if (group.isInputSequence && group.finalValue) {
      const fieldName = group.mouse_aoi || '';
      finalDescription = fieldName
        ? `Input sequence in ${fieldName}: "${group.finalValue}"`
        : `Input sequence: "${group.finalValue}"`;
    } else if (group.isKeyboardSequence) {
      if (!(group.inputString && group.inputString.length > 0)) {
        shouldSkip = true;
      } else {
        let fieldName = (group.mouse_aoi || '')
          .replace(/\s+(Text Field|Input Field|Date Field|Number Field)$/i, '')
          .trim();
        finalDescription = fieldName
          ? `Input "${group.inputString}" in ${fieldName}`
          : `Input "${group.inputString}"`;
      }
    }

    if (shouldSkip) return;

    const lastEvent = group.events[group.events.length - 1];

    // 基础汇总字段（新生成的列）
    const baseRow = {
      'mouse description': finalDescription,
      mouse_aoi: group.mouse_aoi,
      start_time: startTime,
      end_time: endTime,
      start_offset_ms: startOffset !== null ? startOffset : '',
      end_offset_ms: endOffset !== null ? endOffset : '',
      duration_ms: duration !== null ? duration : '',
      event_count: group.events.length,
      mouse_aoi_top_left_x: lastEvent?.mouse_aoi_top_left_x || lastEvent?.aoi_top_left_x || '',
      mouse_aoi_top_left_y: lastEvent?.mouse_aoi_top_left_y || lastEvent?.aoi_top_left_y || '',
      mouse_aoi_top_right_x: lastEvent?.mouse_aoi_top_right_x || lastEvent?.aoi_bottom_right_x || '',
      mouse_aoi_top_right_y: lastEvent?.mouse_aoi_top_right_y || lastEvent?.aoi_bottom_right_y || ''
    };

    // 如果事件里带有 rowValues（原始 CSV 的所有列），就把这些列也并到汇总行里
    // 但不覆盖上面 already 计算好的汇总字段。
    const rawValues = lastEvent?.rowValues;
    if (rawValues && typeof rawValues === 'object') {
      for (const [key, value] of Object.entries(rawValues)) {
        if (baseRow[key] === undefined) {
          baseRow[key] = value;
        }
      }
    }
    // 统一输出列为 mouse description（兼容原始 CSV 的 description 列）
    if (baseRow['description'] !== undefined) {
      baseRow['mouse description'] = baseRow['mouse description'] ?? baseRow['description'];
      delete baseRow['description'];
    }

    summaryData.push(baseRow);
  };

  let currentGroup = null;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const key = extractKey(event);
    const isKeyboard = isKeyboardInput(event);
    const isInputSeq = isInputSequence(event);
    const isChar = isCharacter(key);
    const isBackspace = isBackspaceOrDelete(key);
    const groupKey = event.mouse_aoi ? `${event.description} | ${event.mouse_aoi}` : event.description;

    if (isInputSeq && event.activity) {
      if (currentGroup && currentGroup.isInputSequence && currentGroup.mouse_aoi === event.mouse_aoi &&
          event.offset !== null && currentGroup.lastOffset !== null &&
          (event.offset - currentGroup.lastOffset) <= MAX_KEYBOARD_SEQUENCE_MS) {
        currentGroup.events.push(event);
        currentGroup.lastOffset = event.offset;
        currentGroup.finalValue = event.activity;
        continue;
      }
      saveGroup(currentGroup);
      currentGroup = {
        key: event.mouse_aoi ? `input_sequence_${event.mouse_aoi}` : `input_sequence_${event.description}`,
        description: '',
        mouse_aoi: event.mouse_aoi,
        events: [event],
        lastOffset: event.offset,
        isKeyboardSequence: false,
        isInputSequence: true,
        finalValue: event.activity
      };
      continue;
    }

    if (isKeyboard && currentGroup && currentGroup.mouse_aoi === event.mouse_aoi && currentGroup.isKeyboardSequence &&
        event.offset !== null && currentGroup.lastOffset !== null &&
        (event.offset - currentGroup.lastOffset) <= MAX_KEYBOARD_SEQUENCE_MS) {
      currentGroup.events.push(event);
      currentGroup.lastOffset = event.offset;
      if (isChar) {
        currentGroup.inputString += key;
        currentGroup.keySequence = currentGroup.keySequence ? `${currentGroup.keySequence} "${key}"` : `"${key}"`;
      } else if (isBackspace) {
        if (currentGroup.inputString.length > 0) currentGroup.inputString = currentGroup.inputString.slice(0, -1);
        currentGroup.keySequence = currentGroup.keySequence ? `${currentGroup.keySequence} ←` : '←';
      } else if (key && key.toLowerCase() === 'delete') {
        if (currentGroup.inputString.length > 0) currentGroup.inputString = currentGroup.inputString.slice(0, -1);
        currentGroup.keySequence = currentGroup.keySequence ? `${currentGroup.keySequence} ←` : '←';
      } else {
        const displayKey = key.toLowerCase() === 'backspace' ? '←' : key.toLowerCase() === 'delete' ? '←' : key;
        currentGroup.keySequence = currentGroup.keySequence ? `${currentGroup.keySequence} ${displayKey}` : displayKey;
      }
      continue;
    }

    if (!currentGroup || currentGroup.key !== groupKey ||
        (currentGroup.lastOffset !== null && event.offset !== null && (event.offset - currentGroup.lastOffset) > MAX_GAP_MS) ||
        (isKeyboard && !currentGroup.isKeyboardSequence) || (!isKeyboard && currentGroup.isKeyboardSequence)) {
      saveGroup(currentGroup);
      if (isKeyboard && (isChar || isBackspace)) {
        const inputString = isChar ? key : '';
        const keySequence = isChar ? `"${key}"` : (isBackspace ? '←' : (key && key.toLowerCase() === 'backspace' ? '←' : key));
        currentGroup = {
          key: groupKey,
          description: event.description,
          mouse_aoi: event.mouse_aoi,
          events: [event],
          lastOffset: event.offset,
          isKeyboardSequence: true,
          inputString,
          keySequence: keySequence || ''
        };
      } else {
        currentGroup = {
          key: groupKey,
          description: event.description,
          mouse_aoi: event.mouse_aoi,
          events: [event],
          lastOffset: event.offset,
          isKeyboardSequence: false
        };
      }
    } else {
      currentGroup.events.push(event);
      currentGroup.lastOffset = event.offset;
    }
  }
  saveGroup(currentGroup);
  return summaryData;
}

// Function to generate summary CSV from AOI log files
function generateAOISummary(aoiLogDir, currentSessionId, tempDir) {
  try {
    console.log(`[AOI Summary] Starting summary generation for session ${currentSessionId}`);
    console.log(`[AOI Summary] AOI log directory: ${aoiLogDir}`);
    console.log(`[AOI Summary] Temp directory: ${tempDir}`);
    
    const summaryData = [];
    
    // Function to process CSV files recursively
    function processCSVFiles(srcDir) {
      const items = fs.readdirSync(srcDir);
      
      for (const item of items) {
        const srcPath = path.join(srcDir, item);
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
          // Recursively process subdirectories
          processCSVFiles(srcPath);
        } else if (stat.isFile() && item.endsWith('.csv') && item.includes(currentSessionId)) {
          // Process CSV file
          try {
            console.log(`[AOI Summary] Processing file: ${item}`);
            const content = fs.readFileSync(srcPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
              // No data rows, skip
              console.log(`[AOI Summary] Skipping ${item}: no data rows`);
              continue;
            }
            
            console.log(`[AOI Summary] Found ${lines.length - 1} data rows in ${item}`);
            
            // Parse header (strip BOM so "timestamp_iso" etc. match)
            const header = parseCSVLine(stripBOM(lines[0]));
            const timestampIndex = header.indexOf('timestamp_iso');
            const offsetIndex = header.indexOf('offset_ms');
            const descriptionIndex = header.indexOf('mouse description') >= 0 ? header.indexOf('mouse description') : header.indexOf('description');
            const mouseAoiIndex = header.indexOf('mouse_aoi');
            const keyIndex = header.indexOf('key');
            const activityIndex = header.indexOf('activity');
            const eventTypeIndex = header.indexOf('event_type');
            const aoiTopLeftXIndex = header.indexOf('mouse_aoi_top_left_x') !== -1 ? header.indexOf('mouse_aoi_top_left_x') : header.indexOf('aoi_top_left_x');
            const aoiTopLeftYIndex = header.indexOf('mouse_aoi_top_left_y') !== -1 ? header.indexOf('mouse_aoi_top_left_y') : header.indexOf('aoi_top_left_y');
            const aoiBottomRightXIndex = header.indexOf('mouse_aoi_top_right_x') !== -1 ? header.indexOf('mouse_aoi_top_right_x') : header.indexOf('aoi_bottom_right_x');
            const aoiBottomRightYIndex = header.indexOf('mouse_aoi_top_right_y') !== -1 ? header.indexOf('mouse_aoi_top_right_y') : header.indexOf('aoi_bottom_right_y');
            
            if (timestampIndex === -1 || descriptionIndex === -1) {
              console.log(`Skipping file ${item}: missing required columns`);
              continue;
            }
            
            // Parse all events first
            const events = [];
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const values = parseCSVLine(line);
              if (values.length < header.length) continue;
              
              const timestamp = values[timestampIndex]?.replace(/"/g, '') || '';
              const offset = values[offsetIndex]?.replace(/"/g, '') || '';
              const description = values[descriptionIndex]?.replace(/"/g, '') || '';
              const mouseAoi = mouseAoiIndex !== -1 ? values[mouseAoiIndex]?.replace(/"/g, '') || '' : '';
              const key = keyIndex !== -1 ? values[keyIndex]?.replace(/"/g, '') || '' : '';
              const activity = activityIndex !== -1 ? values[activityIndex]?.replace(/"/g, '') || '' : '';
              const eventType = eventTypeIndex !== -1 ? values[eventTypeIndex]?.replace(/"/g, '') || '' : '';
              const aoiTopLeftX = aoiTopLeftXIndex !== -1 ? values[aoiTopLeftXIndex]?.replace(/"/g, '') || '' : '';
              const aoiTopLeftY = aoiTopLeftYIndex !== -1 ? values[aoiTopLeftYIndex]?.replace(/"/g, '') || '' : '';
              const aoiBottomRightX = aoiBottomRightXIndex !== -1 ? values[aoiBottomRightXIndex]?.replace(/"/g, '') || '' : '';
              const aoiBottomRightY = aoiBottomRightYIndex !== -1 ? values[aoiBottomRightYIndex]?.replace(/"/g, '') || '' : '';
              
              // Skip empty descriptions
              if (!description || description.trim() === '') continue;
              
              events.push({
                timestamp: timestamp,
                offset: offset ? parseInt(offset) : null,
                description: description,
                mouse_aoi: mouseAoi,
                key: key,
                activity: activity,
                event_type: eventType,
                mouse_aoi_top_left_x: aoiTopLeftX,
                mouse_aoi_top_left_y: aoiTopLeftY,
                mouse_aoi_top_right_x: aoiBottomRightX,
                mouse_aoi_top_right_y: aoiBottomRightY
              });
            }
            
            // Sort events by time
            console.log(`[AOI Summary] Parsed ${events.length} events from ${item}`);
            if (events.length === 0) {
              console.log(`[AOI Summary] No events to process in ${item}, skipping`);
              continue;
            }
            
            events.sort((a, b) => {
              if (a.offset !== null && b.offset !== null) {
                return a.offset - b.offset;
              }
              return a.timestamp.localeCompare(b.timestamp);
            });

            const countBefore = summaryData.length;
            const entries = buildSummaryFromEvents(events);
            summaryData.push(...entries);
            const countAfter = summaryData.length;
            console.log(`[AOI Summary] After processing ${item}: added ${countAfter - countBefore} summary entries (total: ${countAfter})`);
          } catch (error) {
            console.error(`[AOI Summary] Error processing CSV file ${item}:`, error);
            console.error(error.stack);
          }
        }
      }
    }
    
    // Process all CSV files
    if (fs.existsSync(aoiLogDir)) {
      console.log(`[AOI Summary] Processing CSV files in ${aoiLogDir}`);
      processCSVFiles(aoiLogDir);
      console.log(`[AOI Summary] Processed files, found ${summaryData.length} summary entries`);
    } else {
      console.log(`[AOI Summary] AOI log directory does not exist: ${aoiLogDir}`);
      return { success: false, count: 0, error: 'AOI log directory not found' };
    }
    
    if (summaryData.length === 0) {
      console.log('[AOI Summary] No summary data collected, returning empty result');
      return { success: false, count: 0, error: 'No events found to summarize' };
    }
    
    // Remove 0-second "Text input in ..." / "Text input" segments (noise from typing in text boxes)
    const beforeFilter = summaryData.length;
    const filtered = summaryData.filter(s => {
      const duration = s.duration_ms;
      const isZeroDuration = duration === 0 || duration === '' || duration === null || duration === undefined;
      if (!isZeroDuration) return true;
      return !isTextInputDescription(s['mouse description']);
    });
    summaryData.length = 0;
    summaryData.push(...filtered);
    if (filtered.length < beforeFilter) {
      console.log(`[AOI Summary] Removed ${beforeFilter - filtered.length} 0-second Text input segments`);
    }
    
    // Sort summary data by start time
    summaryData.sort((a, b) => {
      if (a.start_offset_ms && b.start_offset_ms) {
        return a.start_offset_ms - b.start_offset_ms;
      }
      return a.start_time.localeCompare(b.start_time);
    });
    
    console.log(`[AOI Summary] Sorted ${summaryData.length} entries`);
    
    // Generate CSV - mouse description and mouse_aoi at the end, with coordinates
    const summaryColumns = [
      'start_time',
      'end_time',
      'start_offset_ms',
      'end_offset_ms',
      'duration_ms',
      'event_count',
      'mouse description',
      'mouse_aoi',
      'mouse_aoi_top_left_x',
      'mouse_aoi_top_left_y',
      'mouse_aoi_top_right_x',
      'mouse_aoi_top_right_y'
    ];
    
    const summaryCSV = convertToCSV(summaryData, summaryColumns);
    
    // Write summary CSV file to the export directory (tempDir/aoiFilesDir)
    if (summaryCSV && summaryCSV.trim().length > 0) {
      const summaryFilePath = path.join(tempDir, 'AOI_Summary.csv');
      fs.writeFileSync(summaryFilePath, UTF8_BOM + summaryCSV, 'utf8');
      console.log(`[AOI Summary] Successfully generated AOI_Summary.csv with ${summaryData.length} entries at ${summaryFilePath}`);
      return { success: true, count: summaryData.length };
    } else {
      console.log('[AOI Summary] No summary CSV generated (empty or null)');
      return { success: false, count: 0, error: 'Failed to generate CSV content' };
    }
  } catch (error) {
    console.error('Error generating AOI summary:', error);
    return { success: false, error: error.message };
  }
}

// Generate eye tracking summary: group consecutive gaze samples with same eye_aoi into time segments
function generateEyeTrackingSummary(aoiFilesDir) {
  try {
    const eyePath = path.join(aoiFilesDir, 'eye_tracking.csv');
    if (!fs.existsSync(eyePath)) {
      console.log('[Eye Summary] eye_tracking.csv not found, generating empty summary file');
      const summaryColumns = [
        'start_time',
        'end_time',
        'start_offset_ms',
        'end_offset_ms',
        'duration_ms',
        'sample_count',
        'eye_aoi',
        'eye description',
        'large_eye_aoi'
      ];
      const outPath = path.join(aoiFilesDir, 'eye_tracking_summary.csv');
      fs.writeFileSync(outPath, UTF8_BOM + summaryColumns.join(',') + '\n', 'utf8');
      console.log('[Eye Summary] Generated eye_tracking_summary.csv (header only, no eye_tracking.csv present)');
      return { success: true, count: 0 };
    }
    const content = fs.readFileSync(eyePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      // 只有表头也要输出空的 summary，保留原始列
      const header = parseCSVLine(stripBOM(lines[0]));
      const extraCols = [
        'start_time',
        'end_time',
        'start_offset_ms',
        'end_offset_ms',
        'duration_ms',
        'sample_count'
      ];
      const summaryColumns = [...header, ...extraCols];
      const outPath = path.join(aoiFilesDir, 'eye_tracking_summary.csv');
      fs.writeFileSync(outPath, UTF8_BOM + summaryColumns.join(',') + '\n', 'utf8');
      return { success: true, count: 0 };
    }
    const header = parseCSVLine(stripBOM(lines[0]));
    const tsIdx = header.indexOf('timestamp_iso');
    const offIdx = header.indexOf('offset_ms');
    const eyeAoiIdx = header.indexOf('eye_aoi');
    const eyeDescIdx = header.indexOf('eye description') >= 0 ? header.indexOf('eye description') : -1;
    const largeEyeAoiIdx = header.indexOf('large_eye_aoi');
    if (tsIdx === -1 || offIdx === -1 || eyeAoiIdx === -1) {
      return { success: false, count: 0, error: 'Missing required columns' };
    }
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i].trim());
      if (values.length < header.length) continue;
      const timestamp = values[tsIdx]?.replace(/"/g, '') || '';
      const offset = values[offIdx]?.replace(/"/g, '') || '';
      const eye_aoi = values[eyeAoiIdx]?.replace(/"/g, '') || '';
      const eye_description = eyeDescIdx !== -1 ? (values[eyeDescIdx]?.replace(/"/g, '') || '') : '';
      const large_eye_aoi = largeEyeAoiIdx !== -1 ? (values[largeEyeAoiIdx]?.replace(/"/g, '') || '') : '';

      const rowValues = {};
      for (let c = 0; c < header.length; c++) {
        const colName = header[c];
        const rawVal = values[c] ?? '';
        rowValues[colName] = rawVal.replace(/"/g, '') || '';
      }

      rows.push({
        timestamp,
        offset: offset ? parseInt(offset, 10) : null,
        eye_aoi,
        eye_description,
        large_eye_aoi,
        rowValues
      });
    }
    rows.sort((a, b) => (a.offset != null && b.offset != null ? a.offset - b.offset : 0));
    const segments = [];
    let cur = null;
    for (const r of rows) {
      const key = `${r.eye_aoi}|${r.large_eye_aoi}`;
      if (!cur || cur.key !== key) {
        cur = {
          key,
          eye_aoi: r.eye_aoi,
          eye_description: r.eye_description,
          large_eye_aoi: r.large_eye_aoi,
          start_time: r.timestamp,
          end_time: r.timestamp,
          start_offset_ms: r.offset,
          end_offset_ms: r.offset,
          sample_count: 1,
          lastRaw: r.rowValues
        };
        segments.push(cur);
      } else {
        cur.end_time = r.timestamp;
        cur.end_offset_ms = r.offset;
        cur.sample_count += 1;
        cur.eye_description = r.eye_description;
        cur.lastRaw = r.rowValues;
      }
    }

    const extraCols = [
      'start_time',
      'end_time',
      'start_offset_ms',
      'end_offset_ms',
      'duration_ms',
      'sample_count'
    ];
    
    // 确保 time_indicator 在第二列
    const timeIndicatorIndex = header.indexOf('time_indicator');
    let orderedHeader = [...header];
    
    // 如果 time_indicator 存在但不在第二列，移动到第二列
    if (timeIndicatorIndex !== -1 && timeIndicatorIndex !== 1) {
      orderedHeader.splice(timeIndicatorIndex, 1);
      orderedHeader.splice(1, 0, 'time_indicator');
    } else if (timeIndicatorIndex === -1) {
      // 如果不存在，插入到第二列
      orderedHeader.splice(1, 0, 'time_indicator');
    }
    
    const summaryColumns = [...orderedHeader, ...extraCols];

    const summaryData = segments.map(s => {
      const base = {
        start_time: s.start_time,
        end_time: s.end_time,
        start_offset_ms: s.start_offset_ms != null ? s.start_offset_ms : '',
        end_offset_ms: s.end_offset_ms != null ? s.end_offset_ms : '',
        duration_ms: (s.end_offset_ms != null && s.start_offset_ms != null) ? (s.end_offset_ms - s.start_offset_ms) : '',
        sample_count: s.sample_count,
        eye_aoi: s.eye_aoi,
        'eye description': s.eye_description ?? '',
        large_eye_aoi: s.large_eye_aoi
      };

      const raw = s.lastRaw;
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (base[k] === undefined) {
            base[k] = v;
          }
        }
      }
      return base;
    });
    const summaryCSV = convertToCSV(summaryData, summaryColumns);
    if (summaryCSV && summaryCSV.trim().length > 0) {
      const outPath = path.join(aoiFilesDir, 'eye_tracking_summary.csv');
      fs.writeFileSync(outPath, UTF8_BOM + summaryCSV, 'utf8');
      console.log(`[Eye Summary] Generated eye_tracking_summary.csv with ${summaryData.length} segments`);
      return { success: true, count: summaryData.length };
    }
    return { success: false, count: 0, error: 'No segments' };
  } catch (error) {
    console.error('Error generating eye tracking summary:', error);
    return { success: false, error: error.message };
  }
}

// Generate mouse tracking summary strictly from mouse_movement.csv (no eye data)
function generateMouseTrackingSummary(aoiFilesDir) {
  try {
    const mousePath = path.join(aoiFilesDir, 'mouse_movement.csv');
    if (!fs.existsSync(mousePath)) {
      console.log('[Mouse Summary] mouse_movement.csv not found, skipping');
      return { success: false, count: 0, error: 'mouse_movement.csv not found' };
    }
    const content = fs.readFileSync(mousePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    // 读取原始表头，用于“保留原始所有列”
    const header = parseCSVLine(stripBOM(lines[0]));

    // 汇总生成的新列（在原始列基础上附加）
    const summaryExtraColumns = [
      'start_time',
      'end_time',
      'start_offset_ms',
      'end_offset_ms',
      'duration_ms',
      'event_count'
    ];

    // 确保 time_indicator 在第二列
    const timeIndicatorIndex = header.indexOf('time_indicator');
    let orderedHeader = [...header];
    
    // 如果 time_indicator 存在但不在第二列，移动到第二列
    if (timeIndicatorIndex !== -1 && timeIndicatorIndex !== 1) {
      orderedHeader.splice(timeIndicatorIndex, 1);
      orderedHeader.splice(1, 0, 'time_indicator');
    } else if (timeIndicatorIndex === -1) {
      // 如果不存在，插入到第二列
      orderedHeader.splice(1, 0, 'time_indicator');
    }
    // 输出列名：description 改为 mouse description
    orderedHeader = orderedHeader.map(col => col === 'description' ? 'mouse description' : col);

    // 输出列 = 原始 CSV 的所有列（time_indicator 在第二列）+ 新生成的汇总列
    const summaryColumns = [...orderedHeader, ...summaryExtraColumns];
    // NOTE: for compatibility with existing analysis scripts and UI expectations,
    // we name the summary file "mouse_movement_summary.csv"
    const outPath = path.join(aoiFilesDir, 'mouse_movement_summary.csv');
    if (lines.length < 2) {
      fs.writeFileSync(outPath, UTF8_BOM + summaryColumns.join(',') + '\n', 'utf8');
      console.log('[Mouse Summary] Generated mouse_movement_summary.csv (header only, no data rows in mouse_movement.csv)');
      return { success: true, count: 0 };
    }
    const timestampIndex = header.indexOf('timestamp_iso');
    const offsetIndex = header.indexOf('offset_ms');
    const descriptionIndex = header.indexOf('mouse description') >= 0 ? header.indexOf('mouse description') : header.indexOf('description');
    const mouseAoiIndex = header.indexOf('mouse_aoi');
    const keyIndex = header.indexOf('key');
    const activityIndex = header.indexOf('activity');
    const eventTypeIndex = header.indexOf('event_type');
    const aoiTopLeftXIndex = header.indexOf('mouse_aoi_top_left_x') !== -1 ? header.indexOf('mouse_aoi_top_left_x') : header.indexOf('aoi_top_left_x');
    const aoiTopLeftYIndex = header.indexOf('mouse_aoi_top_left_y') !== -1 ? header.indexOf('mouse_aoi_top_left_y') : header.indexOf('aoi_top_left_y');
    const aoiBottomRightXIndex = header.indexOf('mouse_aoi_top_right_x') !== -1 ? header.indexOf('mouse_aoi_top_right_x') : header.indexOf('aoi_bottom_right_x');
    const aoiBottomRightYIndex = header.indexOf('mouse_aoi_top_right_y') !== -1 ? header.indexOf('mouse_aoi_top_right_y') : header.indexOf('aoi_bottom_right_y');
    if (timestampIndex === -1 || descriptionIndex === -1) {
      fs.writeFileSync(outPath, UTF8_BOM + summaryColumns.join(',') + '\n', 'utf8');
      console.log('[Mouse Summary] Generated mouse_movement_summary.csv (header only, missing required columns in mouse_movement.csv)');
      return { success: true, count: 0 };
    }
    const events = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i].trim());
      if (values.length < header.length) continue;

      const description = values[descriptionIndex]?.replace(/"/g, '') || '';
      if (!description || description.trim() === '') continue;
      if (description === 'Eye gaze sample') continue;

      const timestamp = values[timestampIndex]?.replace(/"/g, '') || '';
      const offset = values[offsetIndex]?.replace(/"/g, '') || '';

      // 构建 rowValues：原始 CSV 中每一列的值（用于写入 summary），列名 description 统一为 mouse description
      const rowValues = {};
      for (let c = 0; c < header.length; c++) {
        const colName = header[c] === 'description' ? 'mouse description' : header[c];
        const rawVal = values[c] ?? '';
        rowValues[colName] = rawVal.replace(/"/g, '') || '';
      }

      events.push({
        timestamp,
        offset: offset ? parseInt(offset, 10) : null,
        description,
        mouse_aoi: mouseAoiIndex !== -1 ? values[mouseAoiIndex]?.replace(/"/g, '') || '' : '',
        key: keyIndex !== -1 ? values[keyIndex]?.replace(/"/g, '') || '' : '',
        activity: activityIndex !== -1 ? values[activityIndex]?.replace(/"/g, '') || '' : '',
        event_type: eventTypeIndex !== -1 ? values[eventTypeIndex]?.replace(/"/g, '') || '' : '',
        mouse_aoi_top_left_x: aoiTopLeftXIndex !== -1 ? values[aoiTopLeftXIndex]?.replace(/"/g, '') || '' : '',
        mouse_aoi_top_left_y: aoiTopLeftYIndex !== -1 ? values[aoiTopLeftYIndex]?.replace(/"/g, '') || '' : '',
        mouse_aoi_top_right_x: aoiBottomRightXIndex !== -1 ? values[aoiBottomRightXIndex]?.replace(/"/g, '') || '' : '',
        mouse_aoi_top_right_y: aoiBottomRightYIndex !== -1 ? values[aoiBottomRightYIndex]?.replace(/"/g, '') || '' : '',
        rowValues
      });
    }
    if (events.length === 0) {
      fs.writeFileSync(outPath, UTF8_BOM + summaryColumns.join(',') + '\n', 'utf8');
      console.log('[Mouse Summary] Generated mouse_tracking_summary.csv (header only, no mouse events after filtering)');
      return { success: true, count: 0 };
    }
    events.sort((a, b) => {
      if (a.offset !== null && b.offset !== null) return a.offset - b.offset;
      return a.timestamp.localeCompare(b.timestamp);
    });
    let summaryData = buildSummaryFromEvents(events);
    const beforeFilter = summaryData.length;
    summaryData = summaryData.filter(s => {
      const duration = s.duration_ms;
      const isZeroDuration = duration === 0 || duration === '' || duration === null || duration === undefined;
      if (!isZeroDuration) return true;
      return !isTextInputDescription(s['mouse description']);
    });
    if (summaryData.length < beforeFilter) {
      console.log(`[Mouse Summary] Removed ${beforeFilter - summaryData.length} 0-second Text input segments`);
    }
    summaryData.sort((a, b) => {
      if (a.start_offset_ms && b.start_offset_ms) return a.start_offset_ms - b.start_offset_ms;
      return a.start_time.localeCompare(b.start_time);
    });
    const summaryCSV = convertToCSV(summaryData, summaryColumns);
    const contentToWrite = summaryCSV && summaryCSV.trim().length > 0
      ? UTF8_BOM + summaryCSV
      : UTF8_BOM + summaryColumns.join(',') + '\n';
      fs.writeFileSync(outPath, contentToWrite, 'utf8');
      console.log(`[Mouse Summary] Generated mouse_movement_summary.csv from mouse_movement.csv with ${summaryData.length} segments`);
    return { success: true, count: summaryData.length };
  } catch (error) {
    console.error('Error generating mouse tracking summary:', error);
    return { success: false, error: error.message };
  }
}

// Get all model names from Prisma client
function getAllModelNames(prisma) {
  // Get all model names by checking Prisma client properties
  // These should match the model names in schema.prisma
  const modelNames = [
    'cac_agency',
    'cac_case',
    'case_mh_assessment',
    'case_mh_assessment_diagnosis',
    'case_mh_assessment_instrument',
    'case_mh_instrument_measure',
    'case_mh_assessment_measure_scores',
    'case_mh_provider',
    'case_mh_service_barriers',
    'case_mh_session_attendee',
    'case_mh_session_attribute_group',
    'case_mh_session_log_enc',
    'case_mh_treatment_models',
    'case_mh_treatment_plans',
    'case_person',
    'case_va_session_attendee',
    'case_va_session_log',
    'case_va_session_service',
    'child_advocacy_center',
    'employee',
    'employee_account',
    'person',
    'pick_list',
    'pick_list_category',
    'pick_list_item',
    'state_table'
  ];

  // Filter to only include models that exist in Prisma client
  return modelNames.filter(modelName => {
    try {
      return prisma[modelName] !== undefined;
    } catch (error) {
      return false;
    }
  });
}

// Export a single table to CSV
async function exportTableToCSV(prisma, modelName) {
  try {
    const data = await prisma[modelName].findMany();
    
    if (data.length === 0) {
      return { columns: [], csv: '' };
    }

    // Get column names from the first row
    const columns = Object.keys(data[0]);
    
    // Convert to CSV
    const csv = convertToCSV(data, columns);
    
    return { columns, csv, rowCount: data.length };
  } catch (error) {
    console.error(`Error exporting table ${modelName}:`, error);
    throw error;
  }
}

// POST /api/export/data
router.post('/data', async (req, res) => {
  let tempDir = null;
  
  try {
    const filename = req.query.filename || req.body.filename || 'export_data';
    
    if (!filename || filename.trim() === '') {
      return res.status(400).json({ error: 'Export name cannot be empty' });
    }

    // Validate filename (no special characters except underscore and hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(filename.trim())) {
      return res.status(400).json({ error: 'Export name can only contain letters, numbers, underscores, and hyphens' });
    }

    const prisma = req.prisma;
    if (!prisma) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a temporary directory for CSV files
    tempDir = path.join(outputDir, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Get all model names dynamically
    const modelNames = getAllModelNames(prisma);
    console.log(`Found ${modelNames.length} models to export`);

    // Export all tables to CSV files
    const exportResults = [];
    for (const modelName of modelNames) {
      try {
        const { columns, csv, rowCount } = await exportTableToCSV(prisma, modelName);
        const csvFilePath = path.join(tempDir, `${modelName}.csv`);
        fs.writeFileSync(csvFilePath, UTF8_BOM + csv, 'utf8');
        exportResults.push({ modelName, rowCount, success: true });
        console.log(`Exported table: ${modelName} (${rowCount} rows)`);
      } catch (error) {
        console.error(`Error exporting table ${modelName}:`, error);
        exportResults.push({ modelName, success: false, error: error.message });
        // Continue with other tables even if one fails
      }
    }

    // Export AOI log files for current session only
    // Get current session ID from query parameter or request body
    const currentSessionId = req.query.session_id || req.body.session_id || null;
    
    const aoiLogDir = path.resolve(process.cwd(), 'AOI log');
    console.log('Looking for AOI logs in:', aoiLogDir);
    console.log('Current session ID:', currentSessionId);
    console.log('AOI log directory exists:', fs.existsSync(aoiLogDir));
    
    if (fs.existsSync(aoiLogDir) && currentSessionId) {
      try {
        const aoiFilesDir = path.join(tempDir, 'AOI_logs');
        fs.mkdirSync(aoiFilesDir, { recursive: true });
        
        let filesExported = 0;
        
        // Collect from combined raw CSV(s); build raw_data.csv and split into eye_tracking / mouse_movement
        let header = null;
        const eyeGazeRows = [];
        const mouseMovementRows = [];

        function collectCSVData(srcDir, destDir) {
          const items = fs.readdirSync(srcDir);
          for (const item of items) {
            const srcPath = path.join(srcDir, item);
            const stat = fs.statSync(srcPath);
            if (stat.isDirectory()) {
              const newDestDir = path.join(destDir, item);
              fs.mkdirSync(newDestDir, { recursive: true });
              collectCSVData(srcPath, newDestDir);
            } else if (stat.isFile() && item.endsWith('.csv') && item.includes(currentSessionId)) {
              try {
                const content = fs.readFileSync(srcPath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                if (lines.length < 2) {
                  console.log(`Skipping ${item}: no data rows`);
                  continue;
                }
                const currentHeader = parseCSVLine(stripBOM(lines[0]));
                const descriptionIndex = currentHeader.indexOf('mouse description') >= 0 ? currentHeader.indexOf('mouse description') : currentHeader.indexOf('description');
                const timestampIndex = currentHeader.indexOf('timestamp_iso');
                const offsetIndex = currentHeader.indexOf('offset_ms');
                const timeIndicatorIndex = currentHeader.indexOf('time_indicator');
                if (descriptionIndex === -1) {
                  console.log(`Skipping ${item}: no mouse description/description column for split`);
                  continue;
                }
                if (!header) header = currentHeader;

                const validRows = [];
                let startTimeMs = null;
                for (let i = 1; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;
                  const values = parseCSVLine(line);
                  if (values.length < currentHeader.length) continue;
                  const description = values[descriptionIndex]?.replace(/"/g, '') || '';
                  if (isTextInputDescription(description)) continue;
                  if (startTimeMs === null) {
                    if (timestampIndex !== -1) {
                      const timestamp = values[timestampIndex]?.replace(/"/g, '') || '';
                      startTimeMs = parseTimestampToMs(timestamp);
                    } else if (offsetIndex !== -1) {
                      startTimeMs = 0;
                    }
                  }
                  validRows.push({ line, values });
                }

                const rawDataRows = [];
                const newHeader = [...currentHeader].map(c => c === 'description' ? 'mouse description' : c);
                const hasTimeIndicatorColumn = timeIndicatorIndex !== -1;
                if (!hasTimeIndicatorColumn && timestampIndex === 0) {
                  newHeader.splice(1, 0, 'time_indicator');
                }
                const eyeAoiIdxRaw = newHeader.indexOf('eye_aoi');
                const mouseAoiIdxRaw = newHeader.indexOf('mouse_aoi');
                if (eyeAoiIdxRaw >= 0) {
                  newHeader.splice(eyeAoiIdxRaw + 1, 0, 'eye description', 'large_eye_aoi');
                } else {
                  newHeader.push('eye_aoi', 'eye description', 'large_eye_aoi');
                }
                if (mouseAoiIdxRaw >= 0) {
                  newHeader.splice(mouseAoiIdxRaw + 1, 0, 'large_mouse_aoi');
                } else {
                  newHeader.push('large_mouse_aoi');
                }
                const eyeAoiIdxCurrent = currentHeader.indexOf('eye_aoi');
                const mouseAoiIdxCurrent = currentHeader.indexOf('mouse_aoi');
                rawDataRows.push(newHeader.join(','));
                for (const { values } of validRows) {
                  const description = values[descriptionIndex]?.replace(/"/g, '') || '';
                  const parsedValues = [...values];
                  let readableTime = '';
                  if (startTimeMs !== null) {
                    if (timestampIndex !== -1) {
                      const timestamp = values[timestampIndex]?.replace(/"/g, '') || '';
                      const currentTimeMs = parseTimestampToMs(timestamp);
                      if (currentTimeMs !== null) readableTime = formatTime(currentTimeMs - startTimeMs);
                    } else if (offsetIndex !== -1) {
                      const offset = values[offsetIndex]?.replace(/"/g, '') || '';
                      if (offset) readableTime = formatTime(Number(offset));
                    }
                  }
                  if (hasTimeIndicatorColumn) {
                    parsedValues[timeIndicatorIndex] = `"${readableTime}"`;
                  } else if (timestampIndex === 0) {
                    parsedValues.splice(1, 0, `"${readableTime}"`);
                  } else if (timestampIndex !== -1) {
                    parsedValues.splice(timestampIndex + 1, 0, `"${readableTime}"`);
                  } else if (offsetIndex !== -1) {
                    parsedValues.splice(1, 0, `"${readableTime}"`);
                  }
                  const eyeAoiVal = eyeAoiIdxCurrent >= 0 ? (values[eyeAoiIdxCurrent]?.replace(/"/g, '') || '') : '';
                  const mouseAoiVal = mouseAoiIdxCurrent >= 0 ? (values[mouseAoiIdxCurrent]?.replace(/"/g, '') || '') : (description && description !== 'Eye gaze sample' ? description : '');
                  const eyeDescVal = description === 'Eye gaze sample' ? description : '';
                  const largeEyeAoiVal = toLargeAoi(eyeAoiVal);
                  const largeMouseAoiVal = toLargeAoi(mouseAoiVal);
                  if (eyeAoiIdxRaw >= 0) {
                    parsedValues.splice(eyeAoiIdxRaw + 1, 0, eyeDescVal, largeEyeAoiVal);
                  } else {
                    parsedValues.push('', eyeDescVal, largeEyeAoiVal);
                  }
                  // Insert large_mouse_aoi after mouse_aoi; if mouse_aoi comes after eye_aoi we already inserted 2 cols so shift position
                  const mouseInsertPos = mouseAoiIdxRaw >= 0
                    ? mouseAoiIdxRaw + 1 + (mouseAoiIdxRaw > eyeAoiIdxRaw ? 2 : 0)
                    : parsedValues.length;
                  if (mouseAoiIdxRaw >= 0) {
                    parsedValues.splice(mouseInsertPos, 0, largeMouseAoiVal);
                  } else {
                    parsedValues.push(largeMouseAoiVal);
                  }
                  const mouseDescIdx = newHeader.indexOf('mouse description');
                  if (mouseDescIdx >= 0) {
                    parsedValues[mouseDescIdx] = description === 'Eye gaze sample' ? '' : parsedValues[mouseDescIdx];
                  }
                  rawDataRows.push(parsedValues.map(v => {
                    const str = String(v);
                    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
                  }).join(','));
                }
                const destPath = path.join(destDir, 'raw_data.csv');
                fs.writeFileSync(destPath, UTF8_BOM + rawDataRows.join('\n') + '\n', 'utf8');
                const rel = path.relative(aoiFilesDir, destDir);
                const logPath = rel ? `AOI_logs/${rel}/raw_data.csv`.replace(/\\/g, '/') : `AOI_logs/raw_data.csv`;
                exportResults.push({ modelName: logPath, rowCount: validRows.length, success: true });
                console.log(`Exported raw_data (excluding Text input rows): ${item}`);
                filesExported++;

                const { header: processedHeader, processRow: processRowForTracking } = ensureTimeIndicatorInSecondColumn(currentHeader, startTimeMs);
                for (let i = 1; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;
                  const values = parseCSVLine(line);
                  if (values.length < currentHeader.length) continue;
                  const description = values[descriptionIndex]?.replace(/"/g, '') || '';
                  const timestamp = timestampIndex !== -1 ? values[timestampIndex]?.replace(/"/g, '') || '' : '';
                  const offset = offsetIndex !== -1 ? values[offsetIndex]?.replace(/"/g, '') || '' : '';
                  const processedValues = processRowForTracking(values, timestamp, offset);
                  const processedLine = processedValues.map(v => {
                    const str = String(v);
                    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
                  }).join(',');
                  if (description === 'Eye gaze sample') {
                    eyeGazeRows.push({ processedValues, description });
                  } else if (!isTextInputDescription(description)) {
                    mouseMovementRows.push(processedLine);
                  }
                }
                const headerWithMouseDesc = (processedHeader || []).map(c => c === 'description' ? 'mouse description' : c);
                if (!header || header.indexOf('time_indicator') !== 1) header = headerWithMouseDesc;
                console.log(`Processed ${item}: ${lines.length - 1} rows`);
              } catch (error) {
                console.error(`Error processing ${item}:`, error);
              }
            }
          }
        }

        collectCSVData(aoiLogDir, aoiFilesDir);

        if (header && eyeGazeRows.length > 0) {
          const eyeTrackingPath = path.join(aoiFilesDir, 'eye_tracking.csv');
          const eyeHeader = [...header];
          const eyeAoiIdx = eyeHeader.indexOf('eye_aoi');
          if (eyeAoiIdx >= 0) {
            eyeHeader.splice(eyeAoiIdx + 1, 0, 'eye description', 'large_eye_aoi');
          } else {
            eyeHeader.push('eye_aoi', 'eye description', 'large_eye_aoi');
          }
          const eyeRows = eyeGazeRows.map(({ processedValues, description }) => {
            const newValues = [...processedValues];
            const eyeAoiVal = eyeAoiIdx >= 0 ? (String(processedValues[eyeAoiIdx] ?? '').replace(/"/g, '')) : '';
            const largeEyeAoiVal = toLargeAoi(eyeAoiVal);
            const insertIdx = eyeAoiIdx >= 0 ? eyeAoiIdx + 1 : newValues.length;
            newValues.splice(insertIdx, 0, description ?? '', largeEyeAoiVal);
            const mouseDescIdx = eyeHeader.indexOf('mouse description');
            if (mouseDescIdx >= 0) newValues[mouseDescIdx] = '';
            return newValues.map(v => {
              const str = String(v);
              return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(',');
          });
          fs.writeFileSync(eyeTrackingPath, UTF8_BOM + [eyeHeader.join(','), ...eyeRows].join('\n') + '\n', 'utf8');
          exportResults.push({ modelName: 'AOI_logs/eye_tracking.csv', rowCount: eyeGazeRows.length, success: true });
          console.log(`Exported eye tracking data: ${eyeGazeRows.length} rows`);
          filesExported++;
        }
        if (header) {
          const mouseMovementPath = path.join(aoiFilesDir, 'mouse_movement.csv');
          const mouseHeader = header.map(c => c === 'description' ? 'mouse description' : c);
          const mouseMovementContent = mouseMovementRows.length > 0
            ? UTF8_BOM + [mouseHeader.join(','), ...mouseMovementRows].join('\n') + '\n'
            : UTF8_BOM + mouseHeader.join(',') + '\n';
          fs.writeFileSync(mouseMovementPath, mouseMovementContent, 'utf8');
          exportResults.push({ modelName: 'AOI_logs/mouse_movement.csv', rowCount: mouseMovementRows.length, success: true });
          console.log(`Exported mouse movement data: ${mouseMovementRows.length} rows`);
          filesExported++;
        }

        if (filesExported === 0) {
          console.log(`No AOI log files found for session ${currentSessionId}`);
        } else {
          console.log(`Exported ${filesExported} AOI log file(s) for session ${currentSessionId}`);
        }

        // Generate AOI summary (from raw session CSVs; includes mouse + other events)
        const summaryResult = generateAOISummary(aoiLogDir, currentSessionId, aoiFilesDir);
        if (summaryResult.success) {
          exportResults.push({ 
            modelName: 'AOI_logs/AOI_Summary.csv', 
            rowCount: summaryResult.count, 
            success: true 
          });
          console.log(`Generated AOI summary with ${summaryResult.count} entries`);
        } else if (summaryResult.error) {
          exportResults.push({ 
            modelName: 'AOI_logs/AOI_Summary.csv', 
            success: false, 
            error: summaryResult.error 
          });
        }

        // Generate mouse tracking summary strictly from mouse_movement.csv (no eye data)
        const mouseSummaryResult = generateMouseTrackingSummary(aoiFilesDir);
        if (mouseSummaryResult.success) {
          exportResults.push({ 
            modelName: 'AOI_logs/mouse_movement_summary.csv', 
            rowCount: mouseSummaryResult.count, 
            success: true 
          });
          console.log(`Generated mouse_movement_summary.csv from mouse_movement.csv with ${mouseSummaryResult.count} entries`);
        } else if (mouseSummaryResult.error) {
          exportResults.push({ 
            modelName: 'AOI_logs/mouse_movement_summary.csv', 
            success: false, 
            error: mouseSummaryResult.error 
          });
        }

        // Generate eye tracking summary (segments of gaze on same eye_aoi)
        const eyeSummaryResult = generateEyeTrackingSummary(aoiFilesDir);
        if (eyeSummaryResult.success) {
          exportResults.push({ 
            modelName: 'AOI_logs/eye_tracking_summary.csv', 
            rowCount: eyeSummaryResult.count, 
            success: true 
          });
          console.log(`Generated eye_tracking_summary.csv with ${eyeSummaryResult.count} segments`);
        } else if (eyeSummaryResult.error) {
          exportResults.push({ 
            modelName: 'AOI_logs/eye_tracking_summary.csv', 
            success: false, 
            error: eyeSummaryResult.error 
          });
        }
      } catch (error) {
        console.error('Error exporting AOI log files:', error);
        exportResults.push({ modelName: 'AOI_logs', success: false, error: error.message });
      }
    } else {
      if (!currentSessionId) {
        console.log('No session ID provided, skipping AOI log export');
      } else {
        console.log('AOI log directory not found, skipping AOI log export');
      }
    }

    // Create zip file
    const zipFilePath = path.join(outputDir, `${filename.trim()}.zip`);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        // Clean up temporary directory
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        const successCount = exportResults.filter(r => r.success).length;
        const failCount = exportResults.filter(r => !r.success).length;
        
        console.log(`Export completed: ${successCount} tables exported, ${failCount} failed`);
        
        // Send the zip file
        res.download(zipFilePath, `${filename.trim()}.zip`, (err) => {
          if (err) {
            console.error('Error sending file:', err);
            // Clean up zip file on error
            if (fs.existsSync(zipFilePath)) {
              fs.unlinkSync(zipFilePath);
            }
            res.status(500).json({ error: 'Error occurred while sending file: ' + err.message });
            reject(err);
          } else {
            console.log('Export file sent successfully');
            // Clean up zip file after successful send (optional, or keep it)
            // fs.unlinkSync(zipFilePath);
            resolve();
          }
        });
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        // Clean up zip file on error
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }
        res.status(500).json({ error: 'Error occurred while creating ZIP file: ' + err.message });
        reject(err);
      });

      archive.pipe(output);
      
      // Add all CSV files to the archive
      archive.directory(tempDir, false);
      
      archive.finalize();
    }).catch((error) => {
      // Handle any unhandled promise rejections
      console.error('Unhandled export error:', error);
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Error occurred while exporting data' });
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    
    // Clean up on error
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
      res.status(500).json({ error: error.message || 'Error occurred while exporting data' });
  }
});

export default router;

