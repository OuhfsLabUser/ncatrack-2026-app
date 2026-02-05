// tests/test-app.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

// Create Express app for testing
const app = express();
app.use(express.json());

const prisma = new PrismaClient();

// Middleware to add prisma to request
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Field max lengths based on schema
const MAX_LENGTHS = {
  case_number: 20,
  va_case_number: 20,
  va_claim_number: 20,
  va_claim_denied_reason: 200,
  mh_case_number: 20
};

// Case routes
app.post('/api/cases', async (req, res) => {
  try {
    console.log('Creating case with data:', JSON.stringify(req.body, null, 2));
    
    // Check for required fields
    if (!req.body.cac_id) {
      return res.status(400).json({ message: 'cac_id is required' });
    }
    
    // Get maximum case ID to create a new one
    const maxCaseIdResult = await prisma.cac_case.findFirst({
      orderBy: {
        case_id: 'desc'
      },
      select: {
        case_id: true
      }
    });
    
    // Generate a new case_id - this is critical because case_id is NOT NULL
    const newCaseId = maxCaseIdResult ? maxCaseIdResult.case_id + 1 : 1;
    console.log('Using new case ID:', newCaseId);
    
    // Prepare the case data with the generated case_id
    const caseData = {
      ...req.body,
      case_id: newCaseId
    };
    
    // Fix date format issues - convert string dates to proper Date objects
    if (caseData.cac_received_date && typeof caseData.cac_received_date === 'string') {
      // If it's just a date (YYYY-MM-DD), append time for a full ISO date
      if (caseData.cac_received_date.length === 10) {
        // Use noon UTC to avoid timezone issues
        caseData.cac_received_date = new Date(`${caseData.cac_received_date}T12:00:00Z`);
      } else {
        // Otherwise parse as is
        caseData.cac_received_date = new Date(caseData.cac_received_date);
      }
    }
    
    if (caseData.case_closed_date && typeof caseData.case_closed_date === 'string') {
      if (caseData.case_closed_date.length === 10) {
        caseData.case_closed_date = new Date(`${caseData.case_closed_date}T12:00:00Z`);
      } else {
        caseData.case_closed_date = new Date(caseData.case_closed_date);
      }
    }
    
    // Ensure string fields don't exceed maximum lengths
    for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
      if (caseData[field] && typeof caseData[field] === 'string' && caseData[field].length > maxLength) {
        console.log(`Trimming ${field} to ${maxLength} characters`);
        caseData[field] = caseData[field].substring(0, maxLength);
      }
    }
    
    console.log('Processed case data:', caseData);
    
    // Create the case
    const newCase = await prisma.cac_case.create({
      data: caseData
    });
    
    console.log('Case created successfully:', newCase);
    res.status(201).json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ 
      message: 'Error creating case', 
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/cases/:id', async (req, res) => {
  try {
    const caseId = parseInt(req.params.id);
    const caseData = await prisma.cac_case.findUnique({
      where: { case_id: caseId }
    });
    
    if (!caseData) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    res.json(caseData);
  } catch (error) {
    console.error('Error getting case:', error);
    res.status(500).json({ 
      message: 'Error getting case', 
      error: error.message 
    });
  }
});

app.delete('/api/cases/:id', async (req, res) => {
  try {
    const caseId = parseInt(req.params.id);
    
    await prisma.cac_case.delete({
      where: { case_id: caseId }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ 
      message: 'Error deleting case', 
      error: error.message 
    });
  }
});

// Agency routes
app.post('/api/agencies', async (req, res) => {
  try {
    // Get maximum agency ID
    const maxAgencyIdResult = await prisma.cac_agency.findFirst({
      orderBy: {
        agency_id: 'desc'
      },
      select: {
        agency_id: true
      }
    });
    
    const newAgencyId = maxAgencyIdResult ? maxAgencyIdResult.agency_id + 1 : 1;
    
    const newAgency = await prisma.cac_agency.create({
      data: {
        agency_id: newAgencyId,
        cac_id: req.body.cac_id,
        agency_name: req.body.agency_name?.substring(0, 50) || null,
        addr_line_1: req.body.addr_line_1?.substring(0, 50) || null,
        addr_line_2: req.body.addr_line_2?.substring(0, 50) || null,
        city: req.body.city?.substring(0, 20) || null,
        state_abbr: req.body.state_abbr?.substring(0, 2) || null,
        phone_number: req.body.phone_number?.substring(0, 20) || null,
        zip_code: req.body.zip_code?.substring(0, 20) || null
      }
    });
    
    res.status(201).json(newAgency);
  } catch (error) {
    console.error('Error creating agency:', error);
    res.status(500).json({ 
      message: 'Error creating agency', 
      error: error.message 
    });
  }
});

app.get('/api/agencies/:id', async (req, res) => {
  try {
    const agencyId = parseInt(req.params.id);
    const agency = await prisma.cac_agency.findUnique({
      where: { agency_id: agencyId }
    });
    
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    
    res.json(agency);
  } catch (error) {
    console.error('Error getting agency:', error);
    res.status(500).json({ 
      message: 'Error getting agency', 
      error: error.message 
    });
  }
});

export default app;