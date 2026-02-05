// tests/debug-schema.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPrismaSchema() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected successfully');
    
    // Check CACs
    console.log('\n--- Child Advocacy Centers ---');
    const cacCount = await prisma.child_advocacy_center.count();
    console.log(`Found ${cacCount} Child Advocacy Centers`);
    
    if (cacCount > 0) {
      const firstCac = await prisma.child_advocacy_center.findFirst();
      console.log('Sample CAC:', firstCac);
    }
    
    // Get cac_case table schema
    console.log('\n--- cac_case Table Schema ---');
    const caseSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'cac_case'
      ORDER BY ordinal_position;
    `;
    
    console.log('Case table has these columns:');
    for (const column of caseSchema) {
      console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})${column.column_default ? ` DEFAULT ${column.column_default}` : ''}`);
    }
    
    // Check for non-nullable columns
    console.log('\n--- Required Fields for cac_case ---');
    const requiredColumns = caseSchema.filter(col => col.is_nullable === 'NO' && col.column_default === null);
    if (requiredColumns.length > 0) {
      console.log('These columns are required (NOT NULL without default):');
      for (const col of requiredColumns) {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      }
    } else {
      console.log('No required columns found (all are nullable or have defaults)');
    }
    
    // Check for existing cases
    console.log('\n--- Existing Cases ---');
    const caseCount = await prisma.cac_case.count();
    console.log(`Found ${caseCount} cases`);
    
    if (caseCount > 0) {
      const firstCase = await prisma.cac_case.findFirst();
      console.log('Sample case:', firstCase);
    }
    
    // Try to create a minimal case
    console.log('\n--- Attempting to Create Test Case ---');
    const cacId = (await prisma.child_advocacy_center.findFirst())?.cac_id;
    
    if (!cacId) {
      console.log('Cannot create test case: No CAC found');
      return;
    }
    
    try {
      const testCase = await prisma.cac_case.create({
        data: {
          case_id: 999999, // Use a high number to avoid conflicts
          cac_id: cacId,
          case_number: `DEBUG-${Date.now()}`
        }
      });
      
      console.log('Test case created successfully:', testCase);
      
      // Clean up
      await prisma.cac_case.delete({
        where: { case_id: testCase.case_id }
      });
      console.log('Test case deleted');
    } catch (error) {
      console.error('Error creating test case:', error);
      
      // Try with additional fields if the error indicates a constraint violation
      if (error.message.includes('violates not-null constraint')) {
        console.log('\n--- Trying with more fields ---');
        try {
          const testCase = await prisma.cac_case.create({
            data: {
              case_id: 999999,
              cac_id: cacId,
              case_number: `DEBUG-${Date.now()}`,
              cac_received_date: new Date(),
            }
          });
          
          console.log('Test case created with additional fields:', testCase);
          
          // Clean up
          await prisma.cac_case.delete({
            where: { case_id: testCase.case_id }
          });
          console.log('Test case deleted');
        } catch (error2) {
          console.error('Error creating test case with additional fields:', error2);
        }
      }
    }
    
  } catch (error) {
    console.error('Database diagnostic error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\nDatabase connection closed');
  }
}

debugPrismaSchema();