// tests/test-case-list-filter.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCaseListFilter() {
  try {
    console.log('Testing Case dropdown filter functionality (only show cases containing Victim)\n');
    
    // 1. Find all case_id containing Victim (role_id = 1)
    const casesWithVictims = await prisma.case_person.findMany({
      where: {
        role_id: 1 // Only cases with Victim role
      },
      select: {
        case_id: true
      }
    });
    
    const caseIdsWithVictims = [...new Set(casesWithVictims.map(cp => cp.case_id))];
    
    console.log(`✅ Found ${caseIdsWithVictims.length} cases containing Victim\n`);
    
    // 2. Find all case_id without Victim
    const allCases = await prisma.cac_case.findMany({
      select: {
        case_id: true
      }
    });
    
    const allCaseIds = allCases.map(c => c.case_id);
    const casesWithoutVictims = allCaseIds.filter(id => !caseIdsWithVictims.includes(id));
    
    console.log(`📊 Statistics:`);
    console.log(`   Total cases: ${allCaseIds.length}`);
    console.log(`   Cases containing Victim: ${caseIdsWithVictims.length}`);
    console.log(`   Cases without Victim: ${casesWithoutVictims.length}\n`);
    
    // 3. Display some examples
    if (caseIdsWithVictims.length > 0) {
      console.log(`✅ Example cases containing Victim (first 5):`);
      const sampleCases = await prisma.cac_case.findMany({
        where: {
          case_id: {
            in: caseIdsWithVictims.slice(0, 5)
          }
        },
        select: {
          case_id: true,
          case_number: true,
          case_person: {
            where: {
              role_id: 1
            },
            select: {
              person_id: true,
              role_id: true
            }
          }
        }
      });
      
      sampleCases.forEach(c => {
        const victimCount = c.case_person.length;
        console.log(`   Case ${c.case_id} (${c.case_number || 'N/A'}): ${victimCount} Victim(s)`);
      });
      console.log('');
    }
    
    if (casesWithoutVictims.length > 0) {
      console.log(`❌ Example cases without Victim (first 5):`);
      const sampleCases = await prisma.cac_case.findMany({
        where: {
          case_id: {
            in: casesWithoutVictims.slice(0, 5)
          }
        },
        select: {
          case_id: true,
          case_number: true,
          case_person: {
            select: {
              person_id: true,
              role_id: true
            }
          }
        }
      });
      
      sampleCases.forEach(c => {
        const roles = c.case_person.map(cp => cp.role_id).filter(r => r !== null);
        console.log(`   Case ${c.case_id} (${c.case_number || 'N/A'}): role_ids = [${roles.join(', ')}]`);
      });
      console.log('');
    }
    
    // 4. Verify filter logic
    console.log('🔍 Verifying filter logic:');
    console.log(`   ✅ Dropdown should display ${caseIdsWithVictims.length} cases`);
    console.log(`   ❌ Dropdown should not display ${casesWithoutVictims.length} cases\n`);
    
    // 5. Check specific case (e.g., 798030076)
    const testCaseId = 798030076;
    const testCase = await prisma.cac_case.findUnique({
      where: { case_id: testCaseId },
      select: {
        case_id: true,
        case_number: true,
        case_person: {
          select: {
            person_id: true,
            role_id: true
          }
        }
      }
    });
    
    if (testCase) {
      const hasVictim = testCase.case_person.some(cp => cp.role_id === 1);
      console.log(`📋 Testing Case ${testCaseId}:`);
      console.log(`   Case Number: ${testCase.case_number || 'N/A'}`);
      console.log(`   Contains Victim: ${hasVictim ? '✅ Yes' : '❌ No'}`);
      console.log(`   Should appear in dropdown: ${hasVictim ? '✅ Yes' : '❌ No'}`);
      console.log(`   All role_id: [${testCase.case_person.map(cp => cp.role_id).join(', ')}]`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCaseListFilter();

