// tests/count-cases-with-victims.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countCasesWithVictims() {
  try {
    console.log('Counting cases containing Victim (role_id = 1)...\n');
    
    // Find all case_id containing Victim (role_id = 1)
    const casesWithVictims = await prisma.case_person.findMany({
      where: {
        role_id: 1 // Only cases with Victim role
      },
      select: {
        case_id: true
      }
    });
    
    // Get unique case_id list
    const caseIdsWithVictims = [...new Set(casesWithVictims.map(cp => cp.case_id))];
    
    // Count totals
    const totalCases = await prisma.cac_case.count();
    const totalCasePersons = await prisma.case_person.count();
    const totalCasePersonsWithVictim = await prisma.case_person.count({
      where: {
        role_id: 1
      }
    });
    
    console.log('=== Statistics ===');
    console.log(`Total cases (cac_case): ${totalCases}`);
    console.log(`Total case_person records: ${totalCasePersons}`);
    console.log(`case_person records with role_id = 1 (Victim): ${totalCasePersonsWithVictim}`);
    console.log(`Unique cases containing Victim: ${caseIdsWithVictims.length}`);
    console.log(`Cases without Victim: ${totalCases - caseIdsWithVictims.length}`);
    console.log('');
    
    // Display some detailed information
    if (caseIdsWithVictims.length > 0) {
      console.log('=== Cases containing Victim ===');
      const cases = await prisma.cac_case.findMany({
        where: {
          case_id: {
            in: caseIdsWithVictims
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
              person_id: true
            }
          }
        },
        orderBy: {
          case_id: 'desc'
        }
      });
      
      cases.forEach((c, index) => {
        const victimCount = c.case_person.length;
        console.log(`${index + 1}. Case ID: ${c.case_id}, Case Number: ${c.case_number || 'N/A'}, Victim count: ${victimCount}`);
      });
    }
    
    console.log('\n✅ Number of matching records (will be displayed in Case dropdown): ' + caseIdsWithVictims.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countCasesWithVictims();

