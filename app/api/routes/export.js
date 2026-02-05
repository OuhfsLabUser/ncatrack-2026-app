import express from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
            
            // Parse header
            const header = parseCSVLine(lines[0]);
            const timestampIndex = header.indexOf('timestamp_iso');
            const offsetIndex = header.indexOf('offset_ms');
            const descriptionIndex = header.indexOf('description');
            const mouseAoiIndex = header.indexOf('mouse_aoi');
            const keyIndex = header.indexOf('key');
            const activityIndex = header.indexOf('activity');
            const eventTypeIndex = header.indexOf('event_type');
            const aoiTopLeftXIndex = header.indexOf('aoi_top_left_x');
            const aoiTopLeftYIndex = header.indexOf('aoi_top_left_y');
            const aoiBottomRightXIndex = header.indexOf('aoi_bottom_right_x');
            const aoiBottomRightYIndex = header.indexOf('aoi_bottom_right_y');
            
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
                aoi_top_left_x: aoiTopLeftX,
                aoi_top_left_y: aoiTopLeftY,
                aoi_bottom_right_x: aoiBottomRightX,
                aoi_bottom_right_y: aoiBottomRightY
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
            
            // Helper function to extract key from description or key field
            const extractKey = (event) => {
              // Try key field first
              if (event.key && event.key.trim()) {
                return event.key.trim();
              }
              
              // Try to extract from description
              // Format: "Key pressed in Field: 'a' (KeyA)" or "Key pressed in Field: Backspace (Backspace)"
              const match = event.description.match(/['"]([^'"]+)['"]|(Backspace|Delete|Enter|Tab|Space)/i);
              if (match) {
                if (match[1]) return match[1]; // Character in quotes
                if (match[2]) return match[2]; // Special key
              }
              
              // Try to extract from description pattern: "Key pressed in Field: key"
              const colonMatch = event.description.split(':');
              if (colonMatch.length > 1) {
                const keyPart = colonMatch[colonMatch.length - 1].trim();
                // Remove parentheses content
                const key = keyPart.replace(/\s*\([^)]*\)\s*$/, '').trim();
                if (key) return key;
              }
              
              return '';
            };
            
            // Helper function to check if event is a keyboard input
            const isKeyboardInput = (event) => {
              return event.description.includes('Key pressed') || 
                     event.description.includes('key_press') ||
                     (event.key && event.key.trim() !== '');
            };
            
            // Helper function to check if event is an input_sequence event
            const isInputSequence = (event) => {
              return event.event_type === 'input_sequence' || 
                     event.description.includes('Input sequence');
            };
            
            // Helper function to check if key is a character (not special key)
            const isCharacter = (key) => {
              if (!key) return false;
              // Single character that's not a special key
              return key.length === 1 && 
                     !['Backspace', 'Delete', 'Enter', 'Tab', 'Space', 'Escape', 
                       'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
            };
            
            // Helper function to check if key is backspace or delete
            const isBackspaceOrDelete = (key) => {
              if (!key) return false;
              const keyLower = key.toLowerCase();
              return keyLower === 'backspace' || keyLower === 'delete' || 
                     key === '←' || key.includes('Backspace') || key.includes('Delete');
            };
            
            // Process events and integrate keyboard input sequences
            const MAX_GAP_MS = 5000; // 5 seconds - if gap is larger, start a new group
            const MAX_KEYBOARD_SEQUENCE_MS = 2000; // 2 seconds for keyboard sequences
            
            let currentGroup = null;
            
            for (let i = 0; i < events.length; i++) {
              const event = events[i];
              const key = extractKey(event);
              const isKeyboard = isKeyboardInput(event);
              const isInputSeq = isInputSequence(event);
              const isChar = isCharacter(key);
              const isBackspace = isBackspaceOrDelete(key);
              
              // Handle input_sequence events separately - use final value from activity field
              if (isInputSeq && event.activity) {
                // Check if this is a continuation of an existing input_sequence group
                if (currentGroup && 
                    currentGroup.isInputSequence &&
                    currentGroup.mouse_aoi === event.mouse_aoi &&
                    event.offset !== null && 
                    currentGroup.lastOffset !== null &&
                    (event.offset - currentGroup.lastOffset) <= MAX_KEYBOARD_SEQUENCE_MS) {
                  // Continue the input_sequence group - update with the latest final value
                  currentGroup.events.push(event);
                  currentGroup.lastOffset = event.offset;
                  currentGroup.finalValue = event.activity; // Use the latest value (which should be the complete string)
                  continue;
                }
                
                // Save previous group if exists
                if (currentGroup && currentGroup.events.length > 0) {
                  const startTime = currentGroup.events[0].timestamp;
                  const endTime = currentGroup.events[currentGroup.events.length - 1].timestamp;
                  const startOffset = currentGroup.events[0].offset;
                  const endOffset = currentGroup.events[currentGroup.events.length - 1].offset;
                  const duration = (endOffset !== null && startOffset !== null) 
                    ? (endOffset - startOffset) 
                    : null;
                  
                  let finalDescription = currentGroup.description;
                  if (currentGroup.isInputSequence && currentGroup.finalValue) {
                    // For input_sequence groups, show the final complete input string
                    let fieldName = currentGroup.mouse_aoi || '';
                    // Keep the full field name including "Text Field" for clarity
                    finalDescription = fieldName
                      ? `Input sequence in ${fieldName}: "${currentGroup.finalValue}"`
                      : `Input sequence: "${currentGroup.finalValue}"`;
                  } else if (currentGroup.isKeyboardSequence) {
                    let fieldName = currentGroup.mouse_aoi || '';
                    if (fieldName) {
                      fieldName = fieldName.replace(/\s+(Text Field|Input Field|Date Field|Number Field)$/i, '').trim();
                    }
                    
                    if (currentGroup.keySequence && currentGroup.keySequence.length > 0) {
                      finalDescription = fieldName
                        ? `Input sequence in ${fieldName}: ${currentGroup.keySequence}`
                        : `Input sequence: ${currentGroup.keySequence}`;
                    } else if (currentGroup.inputString && currentGroup.inputString.length > 0) {
                      finalDescription = fieldName 
                        ? `Input "${currentGroup.inputString}" in ${fieldName}`
                        : `Input "${currentGroup.inputString}"`;
                    }
                  }
                  
                  // Get coordinates from the last event in the group
                  const lastEvent = currentGroup.events[currentGroup.events.length - 1];
                  summaryData.push({
                    description: finalDescription,
                    mouse_aoi: currentGroup.mouse_aoi,
                    start_time: startTime,
                    end_time: endTime,
                    start_offset_ms: startOffset !== null ? startOffset : '',
                    end_offset_ms: endOffset !== null ? endOffset : '',
                    duration_ms: duration !== null ? duration : '',
                    event_count: currentGroup.events.length,
                    aoi_top_left_x: lastEvent?.aoi_top_left_x || '',
                    aoi_top_left_y: lastEvent?.aoi_top_left_y || '',
                    aoi_bottom_right_x: lastEvent?.aoi_bottom_right_x || '',
                    aoi_bottom_right_y: lastEvent?.aoi_bottom_right_y || ''
                  });
                }
                
                // Create a new group for this input_sequence event
                const finalValue = event.activity;
                const groupKey = event.mouse_aoi 
                  ? `input_sequence_${event.mouse_aoi}` 
                  : `input_sequence_${event.description}`;
                
                currentGroup = {
                  key: groupKey,
                  description: '', // Will be set when saving the group
                  mouse_aoi: event.mouse_aoi,
                  events: [event],
                  lastOffset: event.offset,
                  isKeyboardSequence: false,
                  isInputSequence: true,
                  finalValue: finalValue
                };
                continue;
              }
              
              // Check if this is part of a keyboard input sequence
              if (isKeyboard && currentGroup && 
                  currentGroup.mouse_aoi === event.mouse_aoi &&
                  currentGroup.isKeyboardSequence &&
                  event.offset !== null && 
                  currentGroup.lastOffset !== null &&
                  (event.offset - currentGroup.lastOffset) <= MAX_KEYBOARD_SEQUENCE_MS) {
                // Continue keyboard sequence
                currentGroup.events.push(event);
                currentGroup.lastOffset = event.offset;
                
                // Update the input string by simulating the typing
                // Also track the full key sequence for detailed display
                if (isChar) {
                  currentGroup.inputString += key;
                  // Add character to key sequence with quotes for clarity
                  if (!currentGroup.keySequence || currentGroup.keySequence.length === 0) {
                    currentGroup.keySequence = `"${key}"`;
                  } else {
                    currentGroup.keySequence += ` "${key}"`;
                  }
                } else if (isBackspace) {
                  // Remove last character
                  if (currentGroup.inputString.length > 0) {
                    currentGroup.inputString = currentGroup.inputString.slice(0, -1);
                  }
                  // Add backspace to sequence
                  if (!currentGroup.keySequence || currentGroup.keySequence.length === 0) {
                    currentGroup.keySequence = '←';
                  } else {
                    currentGroup.keySequence += ' ←';
                  }
                } else if (key.toLowerCase() === 'delete') {
                  // Delete (similar to backspace but for forward delete)
                  if (currentGroup.inputString.length > 0) {
                    currentGroup.inputString = currentGroup.inputString.slice(0, -1);
                  }
                  // Add delete to sequence
                  if (!currentGroup.keySequence || currentGroup.keySequence.length === 0) {
                    currentGroup.keySequence = '←';
                  } else {
                    currentGroup.keySequence += ' ←';
                  }
                } else {
                  // Other special keys
                  const displayKey = key.toLowerCase() === 'backspace' ? '←' : 
                                   key.toLowerCase() === 'delete' ? '←' : key;
                  if (!currentGroup.keySequence || currentGroup.keySequence.length === 0) {
                    currentGroup.keySequence = displayKey;
                  } else {
                    currentGroup.keySequence += ` ${displayKey}`;
                  }
                }
                continue;
              }
              
              // Start a new group or continue non-keyboard group
              const groupKey = event.mouse_aoi 
                ? `${event.description} | ${event.mouse_aoi}` 
                : event.description;
              
              if (!currentGroup || 
                  currentGroup.key !== groupKey ||
                  (currentGroup.lastOffset !== null && 
                   event.offset !== null && 
                   (event.offset - currentGroup.lastOffset) > MAX_GAP_MS) ||
                  (isKeyboard && !currentGroup.isKeyboardSequence) ||
                  (!isKeyboard && currentGroup.isKeyboardSequence)) {
                // Save previous group
                if (currentGroup && currentGroup.events.length > 0) {
                  const startTime = currentGroup.events[0].timestamp;
                  const endTime = currentGroup.events[currentGroup.events.length - 1].timestamp;
                  const startOffset = currentGroup.events[0].offset;
                  const endOffset = currentGroup.events[currentGroup.events.length - 1].offset;
                  const duration = (endOffset !== null && startOffset !== null) 
                    ? (endOffset - startOffset) 
                    : null;
                  
                  // Format description for keyboard sequences
                  let finalDescription = currentGroup.description;
                  let shouldSkip = false;
                  
                  if (currentGroup.isKeyboardSequence) {
                    // Skip single character inputs or empty sequences - they will be covered by input_sequence events
                    const hasActualInput = currentGroup.inputString && currentGroup.inputString.length > 0;
                    if (!hasActualInput) {
                      // Skip this group - it's just key presses without actual input
                      shouldSkip = true;
                    } else {
                      // Extract field name from mouse_aoi (e.g., "First Name Text Field" -> "First Name")
                      let fieldName = currentGroup.mouse_aoi || '';
                      if (fieldName) {
                        // Remove " Text Field" or similar suffixes
                        fieldName = fieldName.replace(/\s+(Text Field|Input Field|Date Field|Number Field)$/i, '').trim();
                      }
                      
                      // Show final input string (not the detailed key sequence)
                      finalDescription = fieldName 
                        ? `Input "${currentGroup.inputString}" in ${fieldName}`
                        : `Input "${currentGroup.inputString}"`;
                    }
                  }
                  
                  // Only add to summary if not skipping
                  if (!shouldSkip) {
                    // Get coordinates from the last event in the group
                    const lastEvent = currentGroup.events[currentGroup.events.length - 1];
                    summaryData.push({
                      description: finalDescription,
                      mouse_aoi: currentGroup.mouse_aoi,
                      start_time: startTime,
                      end_time: endTime,
                      start_offset_ms: startOffset !== null ? startOffset : '',
                      end_offset_ms: endOffset !== null ? endOffset : '',
                      duration_ms: duration !== null ? duration : '',
                      event_count: currentGroup.events.length,
                      aoi_top_left_x: lastEvent?.aoi_top_left_x || '',
                      aoi_top_left_y: lastEvent?.aoi_top_left_y || '',
                      aoi_bottom_right_x: lastEvent?.aoi_bottom_right_x || '',
                      aoi_bottom_right_y: lastEvent?.aoi_bottom_right_y || ''
                    });
                  }
                }
                
                // Create new group
                if (isKeyboard && (isChar || isBackspace)) {
                  // Start keyboard sequence
                  let inputString = '';
                  let keySequence = '';
                  
                  if (isChar) {
                    inputString = key;
                    keySequence = `"${key}"`; // Use quotes for characters
                  } else if (isBackspace) {
                    keySequence = '←';
                  } else {
                    keySequence = key.toLowerCase() === 'backspace' ? '←' : 
                                key.toLowerCase() === 'delete' ? '←' : key;
                  }
                  
                  currentGroup = {
                    key: groupKey,
                    description: event.description,
                    mouse_aoi: event.mouse_aoi,
                    events: [event],
                    lastOffset: event.offset,
                    isKeyboardSequence: true,
                    inputString: inputString,
                    keySequence: keySequence
                  };
                } else {
                  // Regular group
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
                // Add to current group
                currentGroup.events.push(event);
                currentGroup.lastOffset = event.offset;
              }
            }
            
            // Don't forget the last group
            if (currentGroup && currentGroup.events.length > 0) {
              const startTime = currentGroup.events[0].timestamp;
              const endTime = currentGroup.events[currentGroup.events.length - 1].timestamp;
              const startOffset = currentGroup.events[0].offset;
              const endOffset = currentGroup.events[currentGroup.events.length - 1].offset;
              const duration = (endOffset !== null && startOffset !== null) 
                ? (endOffset - startOffset) 
                : null;
              
              // Format description for keyboard sequences and input_sequence events
              let finalDescription = currentGroup.description;
              let shouldSkip = false;
              
              if (currentGroup.isInputSequence && currentGroup.finalValue) {
                // For input_sequence groups, show the final complete input string
                let fieldName = currentGroup.mouse_aoi || '';
                // Keep the full field name including "Text Field" for clarity
                finalDescription = fieldName
                  ? `Input sequence in ${fieldName}: "${currentGroup.finalValue}"`
                  : `Input sequence: "${currentGroup.finalValue}"`;
              } else if (currentGroup.isKeyboardSequence) {
                // Skip single character inputs or empty sequences - they will be covered by input_sequence events
                const hasActualInput = currentGroup.inputString && currentGroup.inputString.length > 0;
                if (!hasActualInput) {
                  // Skip this group - it's just key presses without actual input
                  shouldSkip = true;
                } else {
                  // Extract field name from mouse_aoi (e.g., "First Name Text Field" -> "First Name")
                  let fieldName = currentGroup.mouse_aoi || '';
                  if (fieldName) {
                    // Remove " Text Field" or similar suffixes
                    fieldName = fieldName.replace(/\s+(Text Field|Input Field|Date Field|Number Field)$/i, '').trim();
                  }
                  
                  // Show final input string (not the detailed key sequence)
                  finalDescription = fieldName 
                    ? `Input "${currentGroup.inputString}" in ${fieldName}`
                    : `Input "${currentGroup.inputString}"`;
                }
              }
              
              // Only add to summary if not skipping
              if (!shouldSkip) {
                // Get coordinates from the last event in the group
                const lastEvent = currentGroup.events[currentGroup.events.length - 1];
                summaryData.push({
                  description: finalDescription,
                  mouse_aoi: currentGroup.mouse_aoi,
                  start_time: startTime,
                  end_time: endTime,
                  start_offset_ms: startOffset !== null ? startOffset : '',
                  end_offset_ms: endOffset !== null ? endOffset : '',
                  duration_ms: duration !== null ? duration : '',
                  event_count: currentGroup.events.length,
                  aoi_top_left_x: lastEvent?.aoi_top_left_x || '',
                  aoi_top_left_y: lastEvent?.aoi_top_left_y || '',
                  aoi_bottom_right_x: lastEvent?.aoi_bottom_right_x || '',
                  aoi_bottom_right_y: lastEvent?.aoi_bottom_right_y || ''
                });
              }
            }
            
            const summaryCountBefore = summaryData.length;
            // The summaryData.push() calls are inside the loop above
            const summaryCountAfter = summaryData.length;
            console.log(`[AOI Summary] After processing ${item}: added ${summaryCountAfter - summaryCountBefore} summary entries (total: ${summaryCountAfter})`);
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
    
    // Sort summary data by start time
    summaryData.sort((a, b) => {
      if (a.start_offset_ms && b.start_offset_ms) {
        return a.start_offset_ms - b.start_offset_ms;
      }
      return a.start_time.localeCompare(b.start_time);
    });
    
    console.log(`[AOI Summary] Sorted ${summaryData.length} entries`);
    
    // Generate CSV - description and mouse_aoi at the end, with coordinates
    const summaryColumns = [
      'start_time',
      'end_time',
      'start_offset_ms',
      'end_offset_ms',
      'duration_ms',
      'event_count',
      'description',
      'mouse_aoi',
      'aoi_top_left_x',
      'aoi_top_left_y',
      'aoi_bottom_right_x',
      'aoi_bottom_right_y'
    ];
    
    const summaryCSV = convertToCSV(summaryData, summaryColumns);
    
    // Write summary CSV file to the export directory (tempDir/aoiFilesDir)
    if (summaryCSV && summaryCSV.trim().length > 0) {
      const summaryFilePath = path.join(tempDir, 'AOI_Summary.csv');
      fs.writeFileSync(summaryFilePath, summaryCSV, 'utf8');
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
        fs.writeFileSync(csvFilePath, csv, 'utf8');
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
        
        // Function to copy session-specific files
        function copySessionFiles(srcDir, destDir, relativePath = '') {
          const items = fs.readdirSync(srcDir);
          
          for (const item of items) {
            const srcPath = path.join(srcDir, item);
            const stat = fs.statSync(srcPath);
            
            if (stat.isDirectory()) {
              // Recursively process subdirectories
              const newDestDir = path.join(destDir, item);
              fs.mkdirSync(newDestDir, { recursive: true });
              copySessionFiles(srcPath, newDestDir, path.join(relativePath, item));
            } else if (stat.isFile() && item.endsWith('.csv')) {
              // Only copy files that match the current session ID
              // File format: {session_id}_{timestamp}.csv or task_{session_id}_{timestamp}.csv
              if (item.includes(currentSessionId)) {
                const destPath = path.join(destDir, item);
                fs.copyFileSync(srcPath, destPath);
                const logPath = relativePath ? `AOI_logs/${relativePath}/${item}` : `AOI_logs/${item}`;
                exportResults.push({ modelName: logPath, rowCount: 0, success: true });
                console.log(`Exported AOI log file: ${logPath}`);
                filesExported++;
              }
            }
          }
        }
        
        copySessionFiles(aoiLogDir, aoiFilesDir);
        
        if (filesExported === 0) {
          console.log(`No AOI log files found for session ${currentSessionId}`);
        } else {
          console.log(`Exported ${filesExported} AOI log file(s) for session ${currentSessionId}`);
        }
        
        // Generate AOI summary
        // Generate summary in the exported AOI_logs directory
        const summaryResult = generateAOISummary(aoiLogDir, currentSessionId, aoiFilesDir);
        if (summaryResult.success) {
          exportResults.push({ 
            modelName: 'AOI_Summary.csv', 
            rowCount: summaryResult.count, 
            success: true 
          });
          console.log(`Generated AOI summary with ${summaryResult.count} entries`);
        } else if (summaryResult.error) {
          exportResults.push({ 
            modelName: 'AOI_Summary.csv', 
            success: false, 
            error: summaryResult.error 
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

