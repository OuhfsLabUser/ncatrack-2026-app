// tests/add-case-person-records.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCasePersonRecords() {
  try {
    const targetCaseId = 798030076;
    
    console.log(`Adding two case_person records for case_id ${targetCaseId}...\n`);
    
    // 1. Check if case exists
    const targetCase = await prisma.cac_case.findUnique({
      where: { case_id: targetCaseId },
      select: {
        case_id: true,
        cac_id: true,
        case_number: true
      }
    });
    
    if (!targetCase) {
      console.error(`❌ Case ID ${targetCaseId} does not exist!`);
      console.log('Please create this case first or use an existing case_id.');
      return;
    }
    
    console.log(`✅ Found case: ${targetCase.case_number || targetCase.case_id}`);
    console.log(`   CAC ID: ${targetCase.cac_id}\n`);
    
    // 2. Check existing case_person records for this case
    const existingRecords = await prisma.case_person.findMany({
      where: { case_id: targetCaseId },
      select: {
        person_id: true,
        role_id: true,
        relationship_id: true
      }
    });
    
    console.log(`This case currently has ${existingRecords.length} case_person record(s):`);
    existingRecords.forEach((cp, index) => {
      console.log(`  ${index + 1}. person_id: ${cp.person_id}, role_id: ${cp.role_id}, relationship_id: ${cp.relationship_id}`);
    });
    console.log('');
    
    // 3. Get available person_id (select from persons under this CAC)
    const availablePersons = await prisma.person.findMany({
      where: {
        cac_id: targetCase.cac_id
      },
      select: {
        person_id: true,
        first_name: true,
        last_name: true
      },
      take: 100 // Limit query count
    });
    
    if (availablePersons.length < 2) {
      console.error(`❌ Insufficient persons under CAC ${targetCase.cac_id} (need at least 2, currently only ${availablePersons.length})`);
      console.log('Please create more person records first.');
      return;
    }
    
    // 4. Select two different person_id (exclude those already associated with this case)
    const existingPersonIds = new Set(existingRecords.map(cp => cp.person_id));
    const candidatePersons = availablePersons.filter(p => !existingPersonIds.has(p.person_id));
    
    if (candidatePersons.length < 2) {
      console.error(`❌ Insufficient available persons (need at least 2, currently only ${candidatePersons.length})`);
      console.log('This case may have already associated most persons.');
      return;
    }
    
    // Select first two available persons
    const person1 = candidatePersons[0];
    const person2 = candidatePersons[1];
    
    console.log(`Will create records using the following persons:`);
    console.log(`  1. person_id: ${person1.person_id} (${person1.first_name} ${person1.last_name})`);
    console.log(`  2. person_id: ${person2.person_id} (${person2.first_name} ${person2.last_name})`);
    console.log('');
    
    // 5. Create first case_person record
    console.log('Creating first case_person record...');
    const record1 = await prisma.case_person.create({
      data: {
        person_id: person1.person_id,
        case_id: targetCaseId,
        cac_id: targetCase.cac_id,
        role_id: 1, // Victim
        relationship_id: 1, // Self
        same_household: false,
        custody: false
      }
    });
    console.log(`✅ First record created successfully:`);
    console.log(`   person_id: ${record1.person_id}, case_id: ${record1.case_id}, role_id: ${record1.role_id}`);
    
    // 6. Create second case_person record
    console.log('\nCreating second case_person record...');
    const record2 = await prisma.case_person.create({
      data: {
        person_id: person2.person_id,
        case_id: targetCaseId,
        cac_id: targetCase.cac_id,
        role_id: 2, // Guardian
        relationship_id: 2, // Parent
        same_household: true,
        custody: true
      }
    });
    console.log(`✅ Second record created successfully:`);
    console.log(`   person_id: ${record2.person_id}, case_id: ${record2.case_id}, role_id: ${record2.role_id}`);
    
    // 7. Verify creation results
    console.log('\nVerifying creation results...');
    const allRecords = await prisma.case_person.findMany({
      where: { case_id: targetCaseId },
      include: {
        person: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: {
        person_id: 'asc'
      }
    });
    
    console.log(`\n✅ Complete! case_id ${targetCaseId} now has ${allRecords.length} case_person record(s):`);
    allRecords.forEach((cp, index) => {
      const personName = `${cp.person.first_name || ''} ${cp.person.last_name || ''}`.trim();
      console.log(`  ${index + 1}. person_id: ${cp.person_id} (${personName}), role_id: ${cp.role_id}, relationship_id: ${cp.relationship_id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation: combination of person_id and case_id already exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addCasePersonRecords();

