// tests/check-database.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database connection and required records...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check for Child Advocacy Centers
    const cacCount = await prisma.child_advocacy_center.count();
    console.log(`Found ${cacCount} Child Advocacy Centers`);
    
    if (cacCount === 0) {
      console.log('⚠️ Warning: No Child Advocacy Centers found. Tests will fail without at least one CAC record.');
      console.log('You need to create at least one CAC record before running tests.');
    } else {
      const cac = await prisma.child_advocacy_center.findFirst();
      console.log(`Sample CAC ID: ${cac.cac_id}, Name: ${cac.cac_name}`);
    }
    
    // Check for agencies
    const agencyCount = await prisma.cac_agency.count();
    console.log(`Found ${agencyCount} agencies`);
    
    // Check for cases
    const caseCount = await prisma.cac_case.count();
    console.log(`Found ${caseCount} cases`);
    
    console.log('\nDatabase check complete!');
    
    if (cacCount > 0) {
      console.log('✅ Your database appears ready for testing');
    } else {
      console.log('❌ Please create required records before testing');
    }
    
  } catch (error) {
    console.error('Error connecting to database:', error);
    console.log('\n❌ Database check failed. Please check your connection settings.');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();