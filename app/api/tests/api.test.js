// tests/api.test.js
import request from 'supertest';
import app from './test-app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Setup and teardown
beforeAll(async () => {
  console.log('Setting up test environment...');
  
  // Connect to the test database
  await prisma.$connect();
  
  // Make sure we have at least one CAC
  const cacCount = await prisma.child_advocacy_center.count();
  if (cacCount === 0) {
    console.warn('Warning: No Child Advocacy Centers found. Tests may fail.');
  } else {
    const firstCac = await prisma.child_advocacy_center.findFirst();
    console.log(`Found CAC with ID: ${firstCac.cac_id}, Name: ${firstCac.cac_name}`);
  }
});

afterAll(async () => {
  // Disconnect from Prisma to end the process cleanly
  await prisma.$disconnect();
  console.log('Test environment cleanup complete.');
});

// Unit Test 1: Create Case and Get Case by ID
describe('Case API', () => {
  let testCaseId;
  
  test('Create a new case', async () => {
    // First get a valid CAC ID from the database
    const firstCac = await prisma.child_advocacy_center.findFirst();
    if (!firstCac) {
      console.warn('No CAC found in database, skipping test');
      return;
    }
    
    // Check the expected schema of cac_case
    const caseSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cac_case'
      ORDER BY ordinal_position;
    `;
    console.log('Case schema:', JSON.stringify(caseSchema, null, 2));
    
    // Use a timestamp to create unique but short case numbers
    const timestamp = Date.now().toString().substring(8); // Just use last 5 digits
    
    const caseData = {
      cac_id: firstCac.cac_id,
      case_number: `T-${timestamp}`, // Keep it short (max 20 chars)
      cac_received_date: new Date().toISOString().split('T')[0]  // Format as YYYY-MM-DD
    };
    
    console.log('Test case data:', caseData);
    
    try {
      const response = await request(app)
        .post('/api/cases')
        .send(caseData);
      
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('case_id');
      testCaseId = response.body.case_id;
      
      // Verify other properties were correctly saved
      expect(response.body.cac_id).toBe(caseData.cac_id);
      expect(response.body.case_number).toBe(caseData.case_number);
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });
  
  test('Get case by ID', async () => {
    // Skip test if case creation failed
    if (!testCaseId) {
      console.warn('Skipping test because case creation failed');
      return;
    }
    
    const response = await request(app)
      .get(`/api/cases/${testCaseId}`);
      
    console.log('Get case response:', JSON.stringify(response.body, null, 2));
    expect(response.status).toBe(200);
    expect(response.body.case_id).toBe(testCaseId);
  });
});

// Unit Test 2: Create Case and Delete a Case
describe('Case Deletion API', () => {
  let deletionTestCaseId;
  
  test('Create a case for deletion', async () => {
    // First get a valid CAC ID from the database
    const firstCac = await prisma.child_advocacy_center.findFirst();
    if (!firstCac) {
      console.warn('No CAC found in database, skipping test');
      return;
    }
    
    // Use a timestamp to create unique but short case numbers
    const timestamp = Date.now().toString().substring(8); // Just use last 5 digits
    
    const caseData = {
      cac_id: firstCac.cac_id,
      case_number: `D-${timestamp}`, // Keep it short (max 20 chars)
      cac_received_date: new Date().toISOString().split('T')[0]  // Format as YYYY-MM-DD
    };
    
    console.log('Deletion test case data:', caseData);
    
    const response = await request(app)
      .post('/api/cases')
      .send(caseData);
    
    console.log('Deletion create response:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('case_id');
    deletionTestCaseId = response.body.case_id;
  });
  
  test('Delete a case', async () => {
    // Skip test if case creation failed
    if (!deletionTestCaseId) {
      console.warn('Skipping test because case creation failed');
      return;
    }
    
    const response = await request(app)
      .delete(`/api/cases/${deletionTestCaseId}`);
    
    expect(response.status).toBe(204);
      
    // Verify case is no longer accessible
    const getResponse = await request(app)
      .get(`/api/cases/${deletionTestCaseId}`);
    
    expect(getResponse.status).toBe(404);
  });
});

// Unit Test 3: Create an Agency and Get Agency by ID
describe('Agency API', () => {
  let testAgencyId;
  
  test('Create a new agency', async () => {
    // First get a valid CAC ID from the database
    const firstCac = await prisma.child_advocacy_center.findFirst();
    if (!firstCac) {
      console.warn('No CAC found in database, skipping test');
      return;
    }
    
    // Check the expected schema of cac_agency
    const agencySchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cac_agency'
      ORDER BY ordinal_position;
    `;
    console.log('Agency schema:', JSON.stringify(agencySchema, null, 2));
    
    // Use timestamp for uniqueness but keep it short
    const timestamp = Date.now().toString().substring(8);
    
    const agencyData = {
      cac_id: firstCac.cac_id,
      agency_name: `Test Agency ${timestamp}`,
      phone_number: '(555)123-4567',
      city: 'Test City',
      state_abbr: 'TX'
    };
    
    console.log('Test agency data:', agencyData);
    
    const response = await request(app)
      .post('/api/agencies')
      .send(agencyData);
    
    console.log('Agency create response:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('agency_id');
    testAgencyId = response.body.agency_id;
    
    // Verify other properties were correctly saved
    expect(response.body.cac_id).toBe(agencyData.cac_id);
    expect(response.body.agency_name).toBe(agencyData.agency_name);
  });
  
  test('Get agency by ID', async () => {
    // Skip test if agency creation failed
    if (!testAgencyId) {
      console.warn('Skipping test because agency creation failed');
      return;
    }
    
    const response = await request(app)
      .get(`/api/agencies/${testAgencyId}`);
    
    console.log('Agency get response:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
    expect(response.body.agency_id).toBe(testAgencyId);
  });
});