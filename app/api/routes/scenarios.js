import express from 'express';
import fs from 'fs';
import path from 'path';
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

// Get all model names from Prisma client
function getAllModelNames(prisma) {
  // List of all tables that should be exported for scenarios
  // This matches the tables used in populate_scenario.py
  const modelNames = [
    'child_advocacy_center',
    'cac_agency',
    'employee',
    'employee_account',
    'person',
    'cac_case',
    'case_person',
    'case_mh_assessment_instrument',
    'case_mh_treatment_models',
    'case_mh_assessment',
    'case_mh_assessment_measure_scores',
    'case_mh_assessment_diagnosis',
    'case_mh_session_log_enc',
    'case_mh_session_attendee',
    'case_mh_session_attribute_group',
    'case_mh_treatment_plans',
    'case_mh_provider',
    'case_mh_service_barriers',
    'case_va_session_log',
    'case_va_session_attendee',
    'case_va_session_service',
    'case_mh_instrument_measure',
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

// Read SQL file to get expected column names
function getSQLColumns(tableName) {
  try {
    const sqlFilePath = path.join(__dirname, '../../database/data_tables_variables', `${tableName}.sql`);
    if (!fs.existsSync(sqlFilePath)) {
      return null;
    }
    
    const insertSql = fs.readFileSync(sqlFilePath, 'utf8');
    // Extract column names from SQL INSERT statement
    const sqlColumnsMatch = insertSql.match(/INSERT INTO\s+\w+\s*\((.*?)\)/is);
    if (sqlColumnsMatch) {
      const sqlColumnNames = sqlColumnsMatch[1]
        .split(',')
        .map(col => col.trim())
        .filter(col => col.length > 0);
      return sqlColumnNames;
    }
    return null;
  } catch (error) {
    console.error(`Error reading SQL file for ${tableName}:`, error);
    return null;
  }
}

// Map Prisma column names to SQL column names
function mapPrismaToSQLColumns(prismaColumns, sqlColumns) {
  if (!sqlColumns) {
    return prismaColumns; // Fallback to Prisma columns if SQL file not found
  }
  
  const mapping = {};
  const prismaLowerToOriginal = {};
  prismaColumns.forEach(col => {
    prismaLowerToOriginal[col.toLowerCase()] = col;
  });
  
  // Create mapping: SQL column -> Prisma column
  sqlColumns.forEach(sqlCol => {
    const sqlColLower = sqlCol.toLowerCase();
    // Try exact match
    if (prismaColumns.includes(sqlCol)) {
      mapping[sqlCol] = sqlCol;
    }
    // Try case-insensitive match
    else if (sqlColLower in prismaLowerToOriginal) {
      mapping[sqlCol] = prismaLowerToOriginal[sqlColLower];
    }
    // Handle specific known mismatches
    else if (sqlCol === 'va_has_police_report' && prismaColumns.includes('va_have_police_report')) {
      mapping[sqlCol] = 'va_have_police_report';
    }
    else if (sqlCol === 'cac_name' && prismaColumns.includes('agency_name')) {
      mapping[sqlCol] = 'agency_name';
    }
    else if (sqlCol === 'instrument_id' && prismaColumns.includes('instruments_id')) {
      mapping[sqlCol] = 'instruments_id';
    }
    else if (sqlCol === 'model_name' && prismaColumns.includes('Name')) {
      mapping[sqlCol] = 'Name';
    }
    else if (sqlCol === 'victim_status' && prismaColumns.includes('victim_status_id')) {
      mapping[sqlCol] = 'victim_status_id';
    }
    else {
      // If no match found, use null (will be empty in CSV)
      mapping[sqlCol] = null;
    }
  });
  
  return { sqlColumns, mapping };
}

// Format a value for CSV export
function formatValueForCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    // Format as YYYY-MM-DD for date-only fields
    // Or YYYY-MM-DD HH:MM:SS for datetime fields
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    
    // Check if it's a date-only (time is midnight) or datetime
    if (hours === '00' && minutes === '00' && seconds === '00') {
      return `${year}-${month}-${day}`;
    } else {
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  
  // Convert to string
  const stringValue = String(value);
  
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Export a single table to CSV
async function exportTableToCSV(prisma, modelName) {
  try {
    // Get SQL expected columns first (this is the source of truth)
    const sqlColumns = getSQLColumns(modelName);
    
    // If SQL file exists, use those columns even if table is empty
    if (sqlColumns && sqlColumns.length > 0) {
      const data = await prisma[modelName].findMany();
      
      // Get Prisma columns from data if available
      const prismaColumns = data.length > 0 ? Object.keys(data[0]) : [];
      
      // Map Prisma columns to SQL columns
      const { sqlColumns: finalColumns, mapping } = mapPrismaToSQLColumns(prismaColumns, sqlColumns);
      
      // Convert data to CSV format with correct column mapping
      const csvRows = [];
      
      // Header row
      csvRows.push(finalColumns.join(','));
      
      // Data rows
      if (data.length > 0) {
        data.forEach(row => {
          const csvValues = finalColumns.map(col => {
            const prismaCol = mapping ? mapping[col] : col;
            if (!prismaCol) {
              return ''; // Column not found in Prisma model
            }
            const value = row[prismaCol];
            return formatValueForCSV(value);
          });
          csvRows.push(csvValues.join(','));
        });
      }
      
      const csv = csvRows.join('\n');
      
      return { columns: finalColumns, csv, rowCount: data.length };
    }
    
    // Fallback: if no SQL file, try to get columns from data
    const data = await prisma[modelName].findMany();
    
    if (data.length === 0) {
      // No SQL file and no data - can't determine columns
      return { columns: [], csv: '', rowCount: 0 };
    }

    // Get column names from the first row (Prisma model columns)
    const prismaColumns = Object.keys(data[0]);
    
    // Convert to CSV with proper formatting
    const csvRows = [];
    csvRows.push(prismaColumns.join(','));
    
    data.forEach(row => {
      const csvValues = prismaColumns.map(col => {
        return formatValueForCSV(row[col]);
      });
      csvRows.push(csvValues.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    return { columns: prismaColumns, csv, rowCount: data.length };
  } catch (error) {
    console.error(`Error exporting table ${modelName}:`, error);
    throw error;
  }
}

// DELETE /api/scenarios/delete/:scenarioName - Must be defined before other routes to avoid conflicts
router.delete('/delete/:scenarioName', async (req, res) => {
  try {
    const { scenarioName } = req.params;
    
    console.log('DELETE /api/scenarios/delete/:scenarioName - Received request:', {
      scenarioName,
      params: req.params,
      method: req.method,
      url: req.url
    });
    
    if (!scenarioName || scenarioName.trim() === '') {
      return res.status(400).json({ error: 'Scenario name is required' });
    }

    const scenariosDir = path.join(__dirname, '../../scenarios');
    const scenarioPath = path.join(scenariosDir, scenarioName.trim());
    
    console.log('Looking for scenario at:', scenarioPath);
    console.log('Scenario exists:', fs.existsSync(scenarioPath));
    
    if (!fs.existsSync(scenarioPath)) {
      return res.status(404).json({ error: `Scenario '${scenarioName}' not found` });
    }

    // Delete the scenario directory and all its contents
    fs.rmSync(scenarioPath, { recursive: true, force: true });
    
    console.log(`Scenario '${scenarioName}' deleted successfully`);
    res.json({
      success: true,
      message: `Scenario '${scenarioName}' deleted successfully`
    });
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while deleting the scenario' });
  }
});

// GET /api/scenarios/list - Must be defined before /load route
router.get('/list', async (req, res) => {
  try {
    // Path: app/api/routes/scenarios.js -> app/scenarios
    const scenariosDir = path.join(__dirname, '../../scenarios');
    
    console.log('Looking for scenarios in:', scenariosDir);
    console.log('Scenarios directory exists:', fs.existsSync(scenariosDir));
    
    if (!fs.existsSync(scenariosDir)) {
      console.log('Scenarios directory does not exist, creating it...');
      fs.mkdirSync(scenariosDir, { recursive: true });
      return res.json({ scenarios: [] });
    }
    
    // Get list of scenario directories
    const items = fs.readdirSync(scenariosDir, { withFileTypes: true });
    const scenarios = [];
    
    for (const item of items) {
      if (item.isDirectory()) {
        const scenarioName = item.name;
        const scenarioPath = path.join(scenariosDir, scenarioName);
        const descriptionPath = path.join(scenarioPath, 'description.txt');
        
        let description = '';
        if (fs.existsSync(descriptionPath)) {
          try {
            description = fs.readFileSync(descriptionPath, 'utf8').trim();
          } catch (readError) {
            console.error(`Error reading description for ${scenarioName}:`, readError);
            description = '';
          }
        }
        
        scenarios.push({
          name: scenarioName,
          description: description || 'No description'
        });
      }
    }
    
    console.log(`Found ${scenarios.length} scenarios`);
    res.json({ scenarios });
  } catch (error) {
    console.error('List scenarios error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'An error occurred while listing scenarios',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/scenarios/save
router.post('/save', async (req, res) => {
  try {
    const { scenarioName, description } = req.body;
    
    if (!scenarioName || scenarioName.trim() === '') {
      return res.status(400).json({ error: 'Scenario name is required' });
    }

    // Validate scenario name (no special characters except underscore and hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(scenarioName.trim())) {
      return res.status(400).json({ error: 'Scenario name can only contain letters, numbers, underscores, and hyphens' });
    }

    const prisma = req.prisma;
    if (!prisma) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Create scenarios directory if it doesn't exist
    // Path: app/api/routes/scenarios.js -> app/scenarios
    const scenariosDir = path.join(__dirname, '../../scenarios');
    if (!fs.existsSync(scenariosDir)) {
      fs.mkdirSync(scenariosDir, { recursive: true });
    }

    // Create the specific scenario directory
    const scenarioDir = path.join(scenariosDir, scenarioName.trim());
    
    // Check if scenario already exists
    if (fs.existsSync(scenarioDir)) {
      return res.status(400).json({ error: `Scenario '${scenarioName}' already exists. Please choose a different name.` });
    }

    // Create scenario directory
    fs.mkdirSync(scenarioDir, { recursive: true });

    // Create description file
    const descriptionText = description && description.trim() ? description.trim() : 'No description';
    const descriptionPath = path.join(scenarioDir, 'description.txt');
    fs.writeFileSync(descriptionPath, descriptionText, 'utf8');

    // Get all model names dynamically
    const modelNames = getAllModelNames(prisma);
    console.log(`Exporting ${modelNames.length} tables to scenario '${scenarioName}'`);

    // Export all tables to CSV files
    const exportResults = [];
    for (const modelName of modelNames) {
      try {
        const { columns, csv, rowCount } = await exportTableToCSV(prisma, modelName);
        
        // Always write CSV file if we have columns (even if no rows)
        // This ensures empty tables have at least a header row
        if (columns && columns.length > 0) {
          const csvFilePath = path.join(scenarioDir, `${modelName}_data.csv`);
          fs.writeFileSync(csvFilePath, csv, 'utf8');
          exportResults.push({ modelName, rowCount, success: true });
          console.log(`Exported table: ${modelName} (${rowCount} rows, ${columns.length} columns)`);
        } else {
          // Table exists but has no data and no SQL file to determine columns
          // Try to create an empty CSV with just a header to prevent "No columns to parse" error
          const csvFilePath = path.join(scenarioDir, `${modelName}_data.csv`);
          // Check if SQL file exists to get column names
          const sqlColumns = getSQLColumns(modelName);
          if (sqlColumns && sqlColumns.length > 0) {
            // Write header-only CSV
            fs.writeFileSync(csvFilePath, sqlColumns.join(',') + '\n', 'utf8');
            exportResults.push({ modelName, rowCount: 0, success: true });
            console.log(`Exported table: ${modelName} (0 rows, ${sqlColumns.length} columns - header only)`);
          } else {
            console.log(`Skipping table ${modelName}: no data and no SQL file found`);
            exportResults.push({ modelName, rowCount: 0, success: false, error: 'No columns found' });
          }
        }
      } catch (error) {
        console.error(`Error exporting table ${modelName}:`, error);
        exportResults.push({ modelName, success: false, error: error.message });
        // Continue with other tables even if one fails
      }
    }

    const successCount = exportResults.filter(r => r.success).length;
    const failCount = exportResults.filter(r => !r.success).length;
    
    console.log(`Scenario '${scenarioName}' saved: ${successCount} tables exported, ${failCount} failed`);

    res.json({
      success: true,
      message: `Scenario '${scenarioName}' saved successfully`,
      scenarioName: scenarioName.trim(),
      tablesExported: successCount,
      tablesFailed: failCount
    });
  } catch (error) {
    console.error('Save scenario error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while saving the scenario' });
  }
});

// PUT /api/scenarios/update
router.put('/update', async (req, res) => {
  try {
    const { originalName, newName, description } = req.body;
    
    if (!originalName || originalName.trim() === '') {
      return res.status(400).json({ error: 'Original scenario name is required' });
    }

    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: 'New scenario name is required' });
    }

    // Validate new scenario name (no special characters except underscore and hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(newName.trim())) {
      return res.status(400).json({ error: 'Scenario name can only contain letters, numbers, underscores, and hyphens' });
    }

    const scenariosDir = path.join(__dirname, '../../scenarios');
    const originalPath = path.join(scenariosDir, originalName.trim());
    const newPath = path.join(scenariosDir, newName.trim());
    
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: `Scenario '${originalName}' not found` });
    }

    // If name changed, rename the directory
    if (originalName.trim() !== newName.trim()) {
      // Check if new name already exists
      if (fs.existsSync(newPath)) {
        return res.status(400).json({ error: `Scenario '${newName}' already exists` });
      }
      fs.renameSync(originalPath, newPath);
    }

    // Update description file
    const descriptionPath = path.join(newPath, 'description.txt');
    const descriptionText = description && description.trim() ? description.trim() : 'No description';
    fs.writeFileSync(descriptionPath, descriptionText, 'utf8');
    
    console.log(`Scenario '${originalName}' updated to '${newName}' successfully`);
    res.json({
      success: true,
      message: `Scenario '${newName}' updated successfully`
    });
  } catch (error) {
    console.error('Update scenario error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while updating the scenario' });
  }
});

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Scenarios router is working' });
});

export default router;

