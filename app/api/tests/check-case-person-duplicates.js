// tests/check-case-person-duplicates.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCasePersonDuplicates() {
  try {
    console.log('Checking case_person data...\n');
    
    // 1. Get all case_person records
    const allCasePersons = await prisma.case_person.findMany({
      select: {
        person_id: true,
        case_id: true,
        cac_id: true
      },
      orderBy: {
        case_id: 'asc'
      }
    });
    
    console.log(`Total records: ${allCasePersons.length}\n`);
    
    if (allCasePersons.length === 0) {
      console.log('⚠️  No case_person records in database');
      return;
    }
    
    // 2. Count how many records each case_id has
    const caseIdCounts = {};
    allCasePersons.forEach(cp => {
      if (!caseIdCounts[cp.case_id]) {
        caseIdCounts[cp.case_id] = [];
      }
      caseIdCounts[cp.case_id].push(cp.person_id);
    });
    
    // 3. Find case_id with multiple persons
    const casesWithMultiplePersons = Object.entries(caseIdCounts)
      .filter(([caseId, personIds]) => personIds.length > 1)
      .map(([caseId, personIds]) => ({
        case_id: parseInt(caseId),
        person_count: personIds.length,
        person_ids: personIds
      }));
    
    console.log('=== Statistics ===');
    console.log(`Total cases: ${Object.keys(caseIdCounts).length}`);
    console.log(`Cases with multiple persons: ${casesWithMultiplePersons.length}`);
    console.log(`Cases with only one person: ${Object.keys(caseIdCounts).length - casesWithMultiplePersons.length}\n`);
    
    // 4. Check for duplicate (person_id, case_id) combinations (this should not exist)
    const keyCounts = {};
    allCasePersons.forEach(cp => {
      const key = `${cp.person_id}_${cp.case_id}`;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(keyCounts)
      .filter(([key, count]) => count > 1)
      .map(([key]) => key);
    
    if (duplicates.length > 0) {
      console.log('❌ Found duplicate (person_id, case_id) combinations (this is abnormal):');
      duplicates.forEach(key => {
        const [personId, caseId] = key.split('_');
        console.log(`  - person_id: ${personId}, case_id: ${caseId}, occurrence count: ${keyCounts[key]}`);
      });
      console.log('');
    } else {
      console.log('✅ No duplicate (person_id, case_id) combinations found (normal)\n');
    }
    
    // 5. Display details of cases with multiple persons
    if (casesWithMultiplePersons.length > 0) {
      console.log('=== Cases with multiple persons (first 20) ===');
      casesWithMultiplePersons.slice(0, 20).forEach(c => {
        console.log(`Case ID: ${c.case_id}, Person count: ${c.person_count}, Person IDs: [${c.person_ids.join(', ')}]`);
      });
      
      if (casesWithMultiplePersons.length > 20) {
        console.log(`... ${casesWithMultiplePersons.length - 20} more cases have multiple persons\n`);
      } else {
        console.log('');
      }
      
      // Display statistics
      const personCountDistribution = {};
      casesWithMultiplePersons.forEach(c => {
        personCountDistribution[c.person_count] = (personCountDistribution[c.person_count] || 0) + 1;
      });
      
      console.log('=== Person count distribution ===');
      Object.entries(personCountDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([count, numCases]) => {
          console.log(`  ${count} person(s): ${numCases} case(s)`);
        });
      console.log('');
    } else {
      console.log('ℹ️  All cases have only one person\n');
    }
    
    // 6. Display some example data
    console.log('=== Example data (first 10 records) ===');
    allCasePersons.slice(0, 10).forEach(cp => {
      console.log(`  person_id: ${cp.person_id}, case_id: ${cp.case_id}, cac_id: ${cp.cac_id}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Query error:', error);
    if (error.message.includes('victim_status_id')) {
      console.error('\n⚠️  Error: Database table may still be using old field name victim_status_id');
      console.error('   Please run Prisma migration to update database structure:');
      console.error('   cd app/api');
      console.error('   npx prisma migrate dev');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkCasePersonDuplicates();

