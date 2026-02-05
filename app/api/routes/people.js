// src/api/routes/people.js
import { Router } from 'express';

const router = Router();

// Normalize incoming date fields so Prisma receives Date objects or null
const normalizeDates = (data) => {
  const dateFields = ['date_of_birth', 'date_of_death', 'date_added'];
  dateFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(data, field)) return;

    let val = data[field];

    // Empty string or undefined/null -> null
    if (val === '' || val === undefined || val === null) {
      data[field] = null;
      return;
    }

    // If it's already a Date, keep it
    if (val instanceof Date) {
      if (isNaN(val.getTime())) data[field] = null;
      return;
    }

    // If it's a number (timestamp), convert
    if (typeof val === 'number') {
      const d = new Date(val);
      data[field] = isNaN(d.getTime()) ? null : d;
      return;
    }

    // If it's a string, try parsing. Accept YYYY-MM-DD or ISO formats.
    if (typeof val === 'string') {
      val = val.trim();

      // Quick sanity: if it's suspiciously short (<8) treat as invalid
      if (val.length < 8) {
        data[field] = null;
        return;
      }

      // Try direct parse
      let parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        data[field] = parsed;
        return;
      }

      // If it looks like YYYY-MM-DD, append UTC midnight
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const isoGuess = `${val}T00:00:00.000Z`;
        parsed = new Date(isoGuess);
        if (!isNaN(parsed.getTime())) {
          data[field] = parsed;
          return;
        }
      }

      // If all parsing fails, set null to avoid Prisma errors
      data[field] = null;
      return;
    }

    // Anything else -> null
    data[field] = null;
  });
  return data;
};

/**
 * @route GET /api/people
 * @desc Get all people
 */
router.get('/', async (req, res, next) => {
  try {
    const people = await req.prisma.person.findMany({
      orderBy: {
        last_name: 'desc'
      },
      select: {
        person_id: true,
        first_name: true,
        last_name: true
      }
    });
    res.json(people);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/people/search-by-firstname/:firstName
 * @desc Search people by first name with case information (same logic as lastName search)
 * NOTE: This route must be defined BEFORE /search/:lastName to avoid route conflicts
 */
router.get('/search-by-firstname/:firstName', async (req, res, next) => {
  try {
    const firstName = req.params.firstName;
    const lastName = req.query.lastName; // Support lastName as query parameter
    
    console.log(`Searching for people with first name: "${firstName}", last name: "${lastName}"`);
    
    // Build where clause - support searching by firstName only, lastName only, or both
    const whereClause = {};
    
    // If firstName is provided and not empty, add it to where clause
    if (firstName && firstName.trim() !== '') {
      whereClause.first_name = {
        contains: firstName,
        mode: 'insensitive'
      };
    }
    
    // If lastName is provided, add it to where clause
    if (lastName && lastName.trim() !== '') {
      whereClause.last_name = {
        contains: lastName,
        mode: 'insensitive'
      };
    }
    
    // If neither firstName nor lastName is provided, return empty result
    if (Object.keys(whereClause).length === 0) {
      return res.json([]);
    }
    
    // First, find all people matching the criteria
    const people = await req.prisma.person.findMany({
      where: whereClause,
      orderBy: { first_name: 'asc' },
      select: {
        person_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        suffix: true,
        nick_name: true,
        ssn: true,
        date_of_birth: true,
        date_of_death: true,
        gender: true,
        self_identified_gender: true,
        pronouns: true,
        race: true,
        religion: true,
        first_language: true,
        voca: true,
        special_populations: true,
        risk_factors: true,
        csec: true,
        material_involvement: true,
        special_needs: true,
        comments_for_people: true,
        prior_convictions: true,
        convicted_against_children: true,
        sex_offender: true,
        sex_predator: true,
        housing_insecurity_risk: true,
        developmental_age: true,
        date_added: true,
        csec_involvement: true,
        custom_field: true,
        ethnicity_6: true,
        bio_custom_field_7: true,
        bio_custom_field_8: true,
        tribe: true
      }
    });
    
    console.log(`Found ${people.length} people matching the search criteria`);
    
    // For each person, fetch their case information
    const peopleWithCases = await Promise.all(people.map(async (person) => {
      try {
        // Find all cases associated with this person
        const casePerson = await req.prisma.case_person.findMany({
          where: { 
            person_id: person.person_id 
          },
          include: {
            cac_case: {
              select: {
                case_id: true,
                case_number: true
              }
            }
          },
          orderBy: {
            role_id: 'asc' // Prioritize Alleged Co-victim (role_id = 1) first
          }
        });
        
        // Add case information to the person object
        return {
          ...person,
          case_person: casePerson
        };
      } catch (err) {
        console.error(`Error fetching case info for person ID ${person.person_id}:`, err);
        // Return the person without case information
        return {
          ...person,
          case_person: []
        };
      }
    }));
    
    res.json(peopleWithCases);
  } catch (error) {
    console.error("Error in /api/people/search-by-firstname/:firstName:", error);
    next(error);
  }
});

/**
 * @route GET /api/people/search/:lastName
 * @desc Search people by last name with case information
 */
router.get('/search/:lastName', async (req, res, next) => {
  try {
    const lastName = req.params.lastName;
    const firstName = req.query.firstName; // Support firstName as query parameter
    
    console.log(`Searching for people with last name: "${lastName}", first name: "${firstName}"`);
    
    // Build where clause - support searching by firstName only, lastName only, or both
    const whereClause = {};
    
    // If lastName is provided and not empty, add it to where clause
    if (lastName && lastName.trim() !== '') {
      whereClause.last_name = {
          contains: lastName,
          mode: 'insensitive'
      };
    }
    
    // If firstName is provided, add it to where clause
    if (firstName && firstName.trim() !== '') {
      whereClause.first_name = {
        contains: firstName,
        mode: 'insensitive'
      };
    }
    
    // If neither lastName nor firstName is provided, return empty result
    if (Object.keys(whereClause).length === 0) {
      return res.json([]);
    }
    
    // First, find all people matching the criteria
    const people = await req.prisma.person.findMany({
      where: whereClause,
      orderBy: lastName && lastName.trim() !== '' ? { last_name: 'asc' } : { first_name: 'asc' },
      select: {
        person_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        suffix: true,
        nick_name: true,
        ssn: true,
        date_of_birth: true,
        date_of_death: true,
        gender: true,
        self_identified_gender: true,
        pronouns: true,
        race: true,
        religion: true,
        first_language: true,
        voca: true,
        special_populations: true,
        risk_factors: true,
        csec: true,
        material_involvement: true,
        special_needs: true,
        comments_for_people: true,
        prior_convictions: true,
        convicted_against_children: true,
        sex_offender: true,
        sex_predator: true,
        housing_insecurity_risk: true,
        developmental_age: true,
        date_added: true,
        csec_involvement: true,
        custom_field: true,
        ethnicity_6: true,
        bio_custom_field_7: true,
        bio_custom_field_8: true,
        tribe: true
      }
    });
    
    console.log(`Found ${people.length} people matching the search criteria`);
    
    // For each person, fetch their case information
    const peopleWithCases = await Promise.all(people.map(async (person) => {
      try {
        // Find all cases associated with this person
        const casePerson = await req.prisma.case_person.findMany({
          where: { 
            person_id: person.person_id 
          },
          include: {
            cac_case: {
              select: {
                case_id: true,
                case_number: true
              }
            }
          },
          orderBy: {
            role_id: 'asc' // Prioritize Alleged Co-victim (role_id = 1) first
          }
        });
        
        // Add case information to the person object
        return {
          ...person,
          case_person: casePerson
        };
      } catch (err) {
        console.error(`Error fetching case info for person ID ${person.person_id}:`, err);
        // Return the person without case information
        return {
          ...person,
          case_person: []
        };
      }
    }));
    
    res.json(peopleWithCases);
  } catch (error) {
    console.error("Error in /api/people/search/:lastName:", error);
    next(error);
  }
});

/**
 * @route GET /api/people/case/:caseId
 * @desc Get all people associated with a case
 */
router.get('/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    console.log(`[GET /api/people/case/:caseId] Fetching people for case_id: ${caseId}`);
    
    const people = await req.prisma.case_person.findMany({
      where: { case_id: caseId },
      include: {
        person: true
      }
    });

    console.log(`[GET /api/people/case/:caseId] Found ${people.length} case_person records`);
    
    // Format the response to include all necessary person fields
    const formattedPeople = people.map(cp => {
      const p = cp.person;
      
      // ⚠️ CRITICAL: Check if person exists
      if (!p) {
        console.error(`[GET /api/people/case/:caseId] WARNING: case_person record ${cp.person_id} has no associated person!`);
        return {
          person_id: cp.person_id,
          first_name: null,
          last_name: null,
          middle_name: null,
          ssn: null,
          date_of_birth: null,
          name: 'N/A (Person not found)',
          age: cp.age || null,
          age_unit: cp.age_unit || null,
          same_household: cp.same_household,
          custody: cp.custody,
          role_id: cp.role_id,
          relationship_id: cp.relationship_id,
          person: null
        };
      }
      
      return {
        person_id: p.person_id,
        // Include person fields directly for easy access
        first_name: p.first_name || null,
        last_name: p.last_name || null,
        middle_name: p.middle_name || null,
        ssn: p.ssn || null,
        date_of_birth: p.date_of_birth,
        // Also include combined name for backward compatibility
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/A',
        // Use case_person age and age_unit instead of calculated age from date_of_birth
        age: cp.age || null,
        age_unit: cp.age_unit || null,
        // Include case_person fields
        same_household: cp.same_household,
        custody: cp.custody,
        role_id: cp.role_id,
        relationship_id: cp.relationship_id,
        // Include person object for nested access (backward compatibility)
        person: {
          person_id: p.person_id,
          first_name: p.first_name || null,
          last_name: p.last_name || null,
          middle_name: p.middle_name || null,
          ssn: p.ssn || null,
          date_of_birth: p.date_of_birth
        }
      };
    });
    
    console.log(`[GET /api/people/case/:caseId] Returning ${formattedPeople.length} formatted people`);
    console.log(`[GET /api/people/case/:caseId] Sample data:`, formattedPeople.length > 0 ? {
      person_id: formattedPeople[0].person_id,
      first_name: formattedPeople[0].first_name,
      last_name: formattedPeople[0].last_name,
      ssn: formattedPeople[0].ssn,
      age: formattedPeople[0].age,
      age_unit: formattedPeople[0].age_unit,
      has_person_object: !!formattedPeople[0].person
    } : 'No people found');
    
    res.json(formattedPeople);
  } catch (error) {
    console.error(`[GET /api/people/case/:caseId] Error:`, error);
    next(error);
  }
});

/**
 * @route GET /api/people/cases-for-person/:personId
 * @desc Get all cases associated with a person with detailed information
 */
router.get('/cases-for-person/:personId', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId);
    console.log(`Fetching cases for person ID: ${personId}`);
    
    const casePerson = await req.prisma.case_person.findMany({
      where: { 
        person_id: personId 
      },
      include: {
        cac_case: {
          include: {
            child_advocacy_center: {
              select: {
                cac_name: true
              }
            }
          }
        }
      },
      orderBy: {
        role_id: 'asc' // Prioritize victims (role_id = 1) first
      }
    });
    
    // Debug: Check raw Prisma data for address fields
    if (casePerson.length > 0) {
      console.log('=== Prisma Raw Data Debug ===');
      const firstRaw = casePerson[0];
      console.log('First case_person raw keys:', Object.keys(firstRaw));
      console.log('address_line_1 in raw:', 'address_line_1' in firstRaw);
      console.log('address_line_1 value:', firstRaw.address_line_1);
      console.log('city value:', firstRaw.city);
      console.log('state_abbr value:', firstRaw.state_abbr);
      console.log('zip value:', firstRaw.zip);
      console.log('county value:', firstRaw.county);
      console.log('=== End Prisma Raw Data Debug ===');
    }
    
    // Format the response to be more useful
    const formattedCases = casePerson.map(cp => {
      // Helper function to safely get field value, always returning null if undefined
      const getField = (value) => {
        return (value !== undefined && value !== null && value !== '') ? value : null;
      };
      
      // Ensure all fields are included even if null/undefined
      // Create base object first
      const formatted = {
        case_id: cp.case_id,
        case_number: cp.cac_case.case_number || `Case #${cp.case_id}`,
        cac_received_date: cp.cac_case.cac_received_date ?? null,
        cac_name: cp.cac_case.child_advocacy_center?.cac_name || `CAC ID: ${cp.cac_id}`,
        role_id: cp.role_id,
        relationship_id: cp.relationship_id,
        same_household: cp.same_household,
        custody: cp.custody,
      };
      
      // CRITICAL: Explicitly add address fields using Object.assign to ensure they're always present
      Object.assign(formatted, {
        // Contact Information fields - ALWAYS include, even if null
        address_line_1: getField(cp.address_line_1),
        address_line_2: getField(cp.address_line_2),
        city: getField(cp.city),
        state_abbr: getField(cp.state_abbr),
        zip: getField(cp.zip),
        county: getField(cp.county),
        region: getField(cp.region),
        // Case Specific Information fields
        victim_status: cp.victim_status ?? null,
        age: cp.age ?? null,
        age_unit: cp.age_unit ?? null,
        school_or_employer: cp.school_or_employer ?? null,
        education_level_id: cp.education_level_id ?? null,
        marital_status_id: cp.marital_status_id ?? null,
        income_level_id: cp.income_level_id ?? null,
        problematic_sex: cp.problematic_sex ?? null,
        mili_connection: cp.mili_connection ?? null,
        mili_type_id: cp.mili_type_id ?? null,
        mili_dependent_relationship: cp.mili_dependent_relationship ?? null,
        mili_connection_name: cp.mili_connection_name ?? null,
        custom_field_1: cp.custom_field_1 ?? null,
        csf_eligible_2: cp.csf_eligible_2 ?? null,
        family_transport_assistance_3: cp.family_transport_assistance_3 ?? null,
        custom_field_4: cp.custom_field_4 ?? null,
        community_5: cp.community_5 ?? null,
        case_person_custom_field_6: cp.case_person_custom_field_6 ?? null,
        case_person_custom_field_7: cp.case_person_custom_field_7 ?? null,
        case_person_custom_field_8: cp.case_person_custom_field_8 ?? null,
        case_person_custom_field_9: cp.case_person_custom_field_9 ?? null,
        start_date: cp.start_date ?? null,
        end_date: cp.end_date ?? null,
        home_phone_number: cp.home_phone_number ?? null,
        cell_phone_number: cp.cell_phone_number ?? null,
        work_phone_number: cp.work_phone_number ?? null,
        email_address: cp.email_address ?? null,
        created_date: cp.cac_case.created_date ?? null
      });
      
      // Final verification: ensure address fields exist
      const requiredAddressFields = ['address_line_1', 'address_line_2', 'city', 'county', 'state_abbr', 'zip', 'region'];
      requiredAddressFields.forEach(field => {
        if (!(field in formatted)) {
          console.error(`❌ CRITICAL: Field ${field} missing after formatting! Forcing addition.`);
          formatted[field] = null;
        }
      });
      
      return formatted;
    });
    
    console.log(`Found ${casePerson.length} cases for person ID ${personId}`);
    
    // CRITICAL FIX: Ensure all address fields are present in every case (even if null)
    // This is a safety net in case the fields were somehow omitted during formatting
    const addressFields = ['address_line_1', 'address_line_2', 'city', 'county', 'state_abbr', 'zip', 'region'];
    formattedCases.forEach((formatted, index) => {
      addressFields.forEach(field => {
        // Force add the field if it doesn't exist or is undefined
        if (!(field in formatted) || formatted[field] === undefined) {
          console.warn(`⚠️ Case ${index + 1}: Missing or undefined field ${field}, forcing addition as null`);
          // Use Object.defineProperty to ensure the property is enumerable and will be included in JSON
          Object.defineProperty(formatted, field, {
            value: null,
            writable: true,
            enumerable: true,  // This ensures it appears in Object.keys() and JSON.stringify()
            configurable: true
          });
        }
      });
    });
    
    // Debug: Log first case's field values to help diagnose N/A issues
    if (formattedCases.length > 0) {
      console.log('=== Backend Debug: First case_person fields ===');
      const firstCase = formattedCases[0];
      console.log('address_line_1:', firstCase.address_line_1);
      console.log('address_line_2:', firstCase.address_line_2);
      console.log('city:', firstCase.city);
      console.log('county:', firstCase.county);
      console.log('state_abbr:', firstCase.state_abbr);
      console.log('zip:', firstCase.zip);
      console.log('home_phone_number:', firstCase.home_phone_number);
      console.log('school_or_employer:', firstCase.school_or_employer);
      console.log('All keys in firstCase:', Object.keys(firstCase));
      console.log('Address-related keys:', Object.keys(firstCase).filter(k => 
        k.includes('address') || k === 'city' || k === 'county' || k === 'state_abbr' || k === 'zip' || k === 'region'
      ));
      
      // Verify all address fields exist
      const missingFields = addressFields.filter(field => !(field in firstCase));
      if (missingFields.length > 0) {
        console.error('❌ MISSING ADDRESS FIELDS in formatted object:', missingFields);
      } else {
        console.log('✅ All address fields present in formatted object');
      }
      
      // Test JSON serialization
      const testJson = JSON.stringify(firstCase);
      const parsed = JSON.parse(testJson);
      const missingInJson = addressFields.filter(field => !(field in parsed));
      if (missingInJson.length > 0) {
        console.error('❌ MISSING ADDRESS FIELDS after JSON serialization:', missingInJson);
      } else {
        console.log('✅ All address fields present after JSON serialization');
      }
      
      console.log('=== End Backend Debug ===');
    }
    
    res.json(formattedCases);
  } catch (error) {
    console.error(`Error fetching cases for person ID ${req.params.personId}:`, error);
    next(error);
  }
});

/**
 * @route POST /api/people
 * @desc Create a new person
 */
router.post('/', async (req, res, next) => {
  try {
    // Get maximum person ID
    const maxPersonIdResult = await req.prisma.person.findFirst({
      orderBy: {
        person_id: 'desc'
      },
      select: {
        person_id: true
      }
    });
    
    const newPersonId = maxPersonIdResult ? maxPersonIdResult.person_id + 1 : 1;
    
    // normalize incoming date strings before creating
    console.debug('POST /api/people raw dates:', {
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      date_added: req.body.date_added
    });
    const data = normalizeDates({ ...req.body });
    console.debug('POST /api/people normalized dates:', {
      date_of_birth: data.date_of_birth,
      date_of_death: data.date_of_death,
      date_added: data.date_added
    });

    const newPerson = await req.prisma.person.create({
      data: {
        person_id: newPersonId,
        cac_id: data.cac_id,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        suffix: data.suffix,
        nick_name: data.nick_name,
        ssn: data.ssn,
        date_of_birth: data.date_of_birth || null,
        date_of_death: data.date_of_death || null,
        gender: data.gender,
        self_identified_gender: data.self_identified_gender,
        pronouns: data.pronouns,
        race: data.race,
        religion: data.religion,
        first_language: data.first_language,
        voca: data.voca,
        special_populations: data.special_populations,
        risk_factors: data.risk_factors,
        csec: data.csec,
        material_involvement: data.material_involvement,
        special_needs: data.special_needs,
        comments_for_people: data.comments_for_people,
        prior_convictions: data.prior_convictions,
        convicted_against_children: data.convicted_against_children,
        sex_offender: data.sex_offender,
        sex_predator: data.sex_predator,
        housing_insecurity_risk: data.housing_insecurity_risk,
        developmental_age: data.developmental_age,
        date_added: data.date_added || null,
        csec_involvement: data.csec_involvement,
        custom_field: data.custom_field,
        ethnicity_6: data.ethnicity_6,
        bio_custom_field_7: data.bio_custom_field_7,
        bio_custom_field_8: data.bio_custom_field_8,
        tribe: data.tribe
      }
    });
    
    res.status(201).json(newPerson);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/people/:id
 * @desc Update a person
 */
router.put('/:id', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.id);
    
    // Log the update for debugging
    console.log(`Updating person ${personId} with data:`, req.body);
    
    // Normalize dates for update as well
    console.debug(`PUT /api/people/${personId} raw dates:`, {
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      date_added: req.body.date_added
    });
    const data = normalizeDates({ ...req.body });
    console.debug(`PUT /api/people/${personId} normalized dates:`, {
      date_of_birth: data.date_of_birth,
      date_of_death: data.date_of_death,
      date_added: data.date_added
    });

    const updatedPerson = await req.prisma.person.update({
      where: { person_id: personId },
      data: {
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        suffix: data.suffix || null,
        nick_name: data.nick_name || null,
        ssn: data.ssn || null,
        date_of_birth: data.date_of_birth || null,
        date_of_death: data.date_of_death || null,
        gender: data.gender || null,
        self_identified_gender: data.self_identified_gender || null,
        pronouns: data.pronouns || null,
        race: data.race || null,
        religion: data.religion || null,
        first_language: data.first_language || null,
        voca: Array.isArray(data.voca) ? data.voca.join(',') : data.voca || null,
        special_populations: Array.isArray(data.special_populations) ? data.special_populations.join(',') : data.special_populations || null,
        risk_factors: data.risk_factors || null,
        csec: data.csec || null,
        material_involvement: data.material_involvement || null,
        special_needs: data.special_needs || null,
        comments_for_people: data.comments_for_people || null,
        prior_convictions: data.prior_convictions ?? null,
        convicted_against_children: data.convicted_against_children ?? null,
        sex_offender: data.sex_offender ?? null,
        sex_predator: data.sex_predator ?? null,
        housing_insecurity_risk: data.housing_insecurity_risk || null,
        developmental_age: data.developmental_age || null,
        date_added: data.date_added || null,
        csec_involvement: data.csec_involvement || null,
        custom_field: data.custom_field || null,
        ethnicity_6: data.ethnicity_6 || null,
        bio_custom_field_7: data.bio_custom_field_7 || null,
        bio_custom_field_8: data.bio_custom_field_8 || null,
        tribe: data.tribe || null
      }
    });
    
    // Log success
    console.log(`Successfully updated person ${personId}`);
    
    res.json(updatedPerson);
  } catch (error) {
    console.error(`Error updating person:`, error);
    next(error);
  }
});

/**
 * @route POST /api/people/case
 * @desc Associate a person with a case
 */
router.post('/case', async (req, res, next) => {
  try {
    const { person_id, case_id, cac_id } = req.body;
    
    console.log(`[POST /api/people/case] Associating person ${person_id} with case ${case_id}, cac_id: ${cac_id}`);
    
    // Validate that person and case exist
    const person = await req.prisma.person.findUnique({
      where: { person_id: parseInt(person_id) },
      select: {
        person_id: true,
        first_name: true,
        last_name: true,
        ssn: true
      }
    });
    
    if (!person) {
      console.error(`[POST /api/people/case] Person ${person_id} not found!`);
      return res.status(404).json({ message: 'Person not found' });
    }
    
    console.log(`[POST /api/people/case] Found person:`, person);
    
    const caseData = await req.prisma.cac_case.findUnique({
      where: { case_id: parseInt(case_id) }
    });
    
    if (!caseData) {
      console.error(`[POST /api/people/case] Case ${case_id} not found!`);
      return res.status(404).json({ message: 'Case not found' });
    }
    
    console.log(`[POST /api/people/case] Found case:`, caseData.case_id);
    
    // Check if the person is already associated with the case
    const existingAssociation = await req.prisma.case_person.findUnique({
      where: {
        person_id_case_id: {
          person_id: parseInt(person_id),
          case_id: parseInt(case_id)
        }
      }
    });
    
    if (existingAssociation) {
      console.log(`[POST /api/people/case] Person ${person_id} already associated with case ${case_id}`);
      return res.status(400).json({ message: 'Person is already associated with this case' });
    }
    
    const association = await req.prisma.case_person.create({
      data: {
        person_id: parseInt(person_id),
        case_id: parseInt(case_id),
        cac_id: parseInt(cac_id)
      },
      include: {
        person: {
          select: {
            person_id: true,
            first_name: true,
            last_name: true,
            ssn: true
          }
        }
      }
    });
    
    console.log(`[POST /api/people/case] Successfully created case_person association:`, {
      person_id: association.person_id,
      case_id: association.case_id,
      has_person: !!association.person,
      person_first_name: association.person?.first_name
    });
    
    res.status(201).json(association);
  } catch (error) {
    console.error('[POST /api/people/case] Error associating person with case:', error);
    next(error);
  }
});

/**
 * @route DELETE /api/people/case/:personId/:caseId
 * @desc Remove a person from a case
 */
router.delete('/case/:personId/:caseId', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId);
    const caseId = parseInt(req.params.caseId);
    
    console.log(`DELETE /api/people/case/${personId}/${caseId} - Attempting to remove person from case`);
    
    // Validate personId and caseId
    if (isNaN(personId) || isNaN(caseId)) {
      return res.status(400).json({ 
        message: 'Invalid person ID or case ID',
        personId: req.params.personId,
        caseId: req.params.caseId
      });
    }
    
    // Check if the association exists
    const existingAssociation = await req.prisma.case_person.findUnique({
      where: {
        person_id_case_id: {
          person_id: personId,
          case_id: caseId
        }
      }
    });
    
    if (!existingAssociation) {
      console.log(`Association not found: person_id=${personId}, case_id=${caseId}`);
      return res.status(404).json({ 
        message: 'Association not found',
        personId: personId,
        caseId: caseId
      });
    }
    
    console.log(`Found association, deleting: person_id=${personId}, case_id=${caseId}`);
    
    await req.prisma.case_person.delete({
      where: {
        person_id_case_id: {
          person_id: personId,
          case_id: caseId
        }
      }
    });
    
    console.log(`Successfully deleted association: person_id=${personId}, case_id=${caseId}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing person from case:', error);
    next(error);
  }
});

/**
 * @route PUT /api/people/case/:personId/:caseId/household
 * @desc Update same household status for a person in a case
 */
router.put('/case/:personId/:caseId/household', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId);
    const caseId = parseInt(req.params.caseId);
    const { same_household } = req.body;
    
    const updated = await req.prisma.case_person.update({
      where: {
        person_id_case_id: {
          person_id: personId,
          case_id: caseId
        }
      },
      data: {
        same_household: same_household
      }
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/people/case/:personId/:caseId/custody
 * @desc Update custody status for a person in a case
 */
router.put('/case/:personId/:caseId/custody', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId);
    const caseId = parseInt(req.params.caseId);
    const { custody } = req.body;
    
    const updated = await req.prisma.case_person.update({
      where: {
        person_id_case_id: {
          person_id: personId,
          case_id: caseId
        }
      },
      data: {
        custody: custody
      }
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/people/case/:personId/:caseId
 * @desc Update case-specific details for a person
 */
router.put('/case/:personId/:caseId', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId);
    const caseId = parseInt(req.params.caseId);
    
    // Build update data object with all fields from Prisma schema
    const updateData = {};
    
    // Basic fields
    if (req.body.relationship_id !== undefined) updateData.relationship_id = req.body.relationship_id;
    if (req.body.role_id !== undefined) updateData.role_id = req.body.role_id;
    if (req.body.age !== undefined) updateData.age = req.body.age;
    if (req.body.age_unit !== undefined) updateData.age_unit = req.body.age_unit;
    
    // Address fields
    if (req.body.address_line_1 !== undefined) updateData.address_line_1 = req.body.address_line_1;
    if (req.body.address_line_2 !== undefined) updateData.address_line_2 = req.body.address_line_2;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.state_abbr !== undefined) updateData.state_abbr = req.body.state_abbr;
    if (req.body.zip !== undefined) updateData.zip = req.body.zip;
    if (req.body.county !== undefined) updateData.county = req.body.county;
    if (req.body.region !== undefined) updateData.region = req.body.region;
    if (req.body.out_of_country !== undefined) updateData.out_of_country = req.body.out_of_country;
    
    // Date fields
    if (req.body.start_date !== undefined) {
      updateData.start_date = req.body.start_date ? new Date(req.body.start_date) : null;
    }
    if (req.body.end_date !== undefined) {
      updateData.end_date = req.body.end_date ? new Date(req.body.end_date) : null;
    }
    
    // Contact fields
    if (req.body.home_phone_number !== undefined) updateData.home_phone_number = req.body.home_phone_number;
    if (req.body.cell_phone_number !== undefined) updateData.cell_phone_number = req.body.cell_phone_number;
    if (req.body.work_phone_number !== undefined) updateData.work_phone_number = req.body.work_phone_number;
    if (req.body.email_address !== undefined) updateData.email_address = req.body.email_address;
    
    // Case specific fields
    if (req.body.same_household !== undefined) updateData.same_household = req.body.same_household;
    if (req.body.school_or_employer !== undefined) updateData.school_or_employer = req.body.school_or_employer;
    if (req.body.custody !== undefined) updateData.custody = req.body.custody;
    if (req.body.education_level_id !== undefined) updateData.education_level_id = req.body.education_level_id;
    if (req.body.income_level_id !== undefined) updateData.income_level_id = req.body.income_level_id;
    if (req.body.marital_status_id !== undefined) updateData.marital_status_id = req.body.marital_status_id;
    if (req.body.victim_status !== undefined) updateData.victim_status = req.body.victim_status;
    if (req.body.problematic_sex !== undefined) updateData.problematic_sex = req.body.problematic_sex;
    if (req.body.mili_connection !== undefined) updateData.mili_connection = req.body.mili_connection;
    if (req.body.mili_type_id !== undefined) updateData.mili_type_id = req.body.mili_type_id;
    if (req.body.mili_dependent_relationship !== undefined) updateData.mili_dependent_relationship = req.body.mili_dependent_relationship;
    if (req.body.mili_connection_name !== undefined) updateData.mili_connection_name = req.body.mili_connection_name;
    if (req.body.custom_field_1 !== undefined) updateData.custom_field_1 = req.body.custom_field_1;
    if (req.body.csf_eligible_2 !== undefined) updateData.csf_eligible_2 = req.body.csf_eligible_2;
    if (req.body.family_transport_assistance_3 !== undefined) updateData.family_transport_assistance_3 = req.body.family_transport_assistance_3;
    if (req.body.custom_field_4 !== undefined) updateData.custom_field_4 = req.body.custom_field_4;
    if (req.body.community_5 !== undefined) updateData.community_5 = req.body.community_5;
    // Custom fields with length validation (VARCHAR(255) limit)
    if (req.body.case_person_custom_field_6 !== undefined) {
      const value = req.body.case_person_custom_field_6;
      if (value && typeof value === 'string' && value.length > 255) {
        console.warn('⚠️ case_person_custom_field_6 exceeds 255 characters, truncating...', {
          originalLength: value.length
        });
        updateData.case_person_custom_field_6 = value.substring(0, 255);
      } else {
        updateData.case_person_custom_field_6 = value;
      }
    }
    if (req.body.case_person_custom_field_7 !== undefined) {
      const value = req.body.case_person_custom_field_7;
      if (value && typeof value === 'string' && value.length > 255) {
        console.warn('⚠️ case_person_custom_field_7 exceeds 255 characters, truncating...', {
          originalLength: value.length
        });
        updateData.case_person_custom_field_7 = value.substring(0, 255);
      } else {
        updateData.case_person_custom_field_7 = value;
      }
    }
    if (req.body.case_person_custom_field_8 !== undefined) {
      const value = req.body.case_person_custom_field_8;
      if (value && typeof value === 'string' && value.length > 255) {
        console.warn('⚠️ case_person_custom_field_8 exceeds 255 characters, truncating...', {
          originalLength: value.length
        });
        updateData.case_person_custom_field_8 = value.substring(0, 255);
      } else {
        updateData.case_person_custom_field_8 = value;
      }
    }
    if (req.body.case_person_custom_field_9 !== undefined) {
      const value = req.body.case_person_custom_field_9;
      if (value && typeof value === 'string' && value.length > 255) {
        console.warn('⚠️ case_person_custom_field_9 exceeds 255 characters, truncating...', {
          originalLength: value.length
        });
        updateData.case_person_custom_field_9 = value.substring(0, 255);
      } else {
        updateData.case_person_custom_field_9 = value;
      }
    }
    
    const updated = await req.prisma.case_person.update({
      where: {
        person_id_case_id: {
          person_id: personId,
          case_id: caseId
        }
      },
      data: updateData
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/people/:id
 * @desc Get a person by id with detailed information
 * NOTE: This route must be defined last to avoid conflicts with other routes
 */
router.get('/:id', async (req, res, next) => {
  try {
    const personId = parseInt(req.params.id);
    const person = await req.prisma.person.findUnique({
      where: { person_id: personId }
    });
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    const nick_name = person.nick_name || null;
    const ssn = person.ssn || null;
    
    // Create an enhanced person object with all the fields we want to display
    const enhancedPerson = {
      ...person,
      nick_name,
      ssn,
      // You can add additional computed fields here if needed
    };
    
    res.json(enhancedPerson);
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate age from date of birth
function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default router;