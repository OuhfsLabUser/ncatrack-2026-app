import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/case-search
 * @desc Search cases by case number, person name, or other criteria
 */
router.get('/', async (req, res, next) => {
  try {
    const searchTerm = req.query.term || '';
    
    console.log(`Searching for cases with term: ${searchTerm}`);
    
    if (!searchTerm.trim()) {
      return res.json([]);
    }
    
    // Search for cases matching the case number
    const caseNumberMatches = await req.prisma.cac_case.findMany({
      where: {
        case_number: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        case_id: true,
        case_number: true,
        cac_id: true,
        child_advocacy_center: {
          select: {
            cac_name: true
          }
        },
        case_person: {
          take: 1,
          select: {
            person: {
              select: {
                person_id: true,
                first_name: true,
                last_name: true
              }
            },
            role_id: true
          },
          orderBy: {
            role_id: 'asc'
          }
        }
      },
      take: 50
    });
    
    // Search for cases with matching person names
    const personMatches = await req.prisma.person.findMany({
      where: {
        OR: [
          {
            first_name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            last_name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        person_id: true,
        first_name: true,
        last_name: true,
        case_person: {
          select: {
            case_id: true,
          }
        }
      },
      take: 50
    });
    
    // Extract case IDs from the person matches
    const caseIds = personMatches.flatMap(person => 
      person.case_person.map(cp => cp.case_id)
    );
    
    // Only look up cases if we have IDs to search for
    let personRelatedCases = [];
    if (caseIds.length > 0) {
      personRelatedCases = await req.prisma.cac_case.findMany({
        where: {
          case_id: {
            in: caseIds
          }
        },
        select: {
          case_id: true,
          case_number: true,
          cac_id: true,
          child_advocacy_center: {
            select: {
              cac_name: true
            }
          },
          case_person: {
            take: 1,
            select: {
              person: {
                select: {
                  person_id: true,
                  first_name: true,
                  last_name: true
                }
              },
              role_id: true
            },
            orderBy: {
              role_id: 'asc'
            }
          }
        }
      });
    }
    
    // Combine results and remove duplicates
    const allCases = [...caseNumberMatches];
    personRelatedCases.forEach(personCase => {
      // Check if case is already in the results
      if (!allCases.some(c => c.case_id === personCase.case_id)) {
        allCases.push(personCase);
      }
    });
    
    // Map results to the expected format
    const formattedResults = allCases.map(caseData => {
      const person = caseData.case_person?.[0]?.person;
      return {
        id: caseData.case_id.toString(),
        number: caseData.case_number || `Case #${caseData.case_id}`,
        name: person ? `${person.last_name}, ${person.first_name}` : 'Unknown Person',
        cacName: caseData.child_advocacy_center?.cac_name || `CAC ID: ${caseData.cac_id}`
      };
    });
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Error in case search:', error);
    next(error);
  }
});

export default router;