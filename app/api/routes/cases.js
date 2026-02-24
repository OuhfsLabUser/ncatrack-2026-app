// src/api/routes/cases.js
import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/cases
 * @desc Get all cases
 */
router.get('/', async (req, res, next) => {
  try {
    const cases = await req.prisma.cac_case.findMany({
      include: {
        child_advocacy_center: true,
        cac_agency_cac_case_va_agency_idTocac_agency: true
      }
    });

    // Normalize date fields as YYYY-MM-DD strings so the frontend does not need to handle timezones
    const serialized = cases.map(c => ({
      ...c,
      cac_received_date: c.cac_received_date ? c.cac_received_date.toISOString().slice(0, 10) : null,
      case_closed_date: c.case_closed_date ? c.case_closed_date.toISOString().slice(0, 10) : null,
      created_date: c.created_date ? c.created_date.toISOString().slice(0, 10) : null
    }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/cases/list
 * @desc Get a simplified list of cases for dropdown with primary person information
 */
router.get('/list', async (req, res, next) => {
  try {
    console.log("Fetching cases list with person information for dropdown (filtered by Alleged Co-victim role)");
    
    // First, find all case_ids that have at least one case_person with role_id = 1 (Alleged Co-victim)
    const casesWithVictims = await req.prisma.case_person.findMany({
      where: {
        role_id: 1 // Only cases with Alleged Co-victim role (role_id = 1)
      },
      select: {
        case_id: true
      }
    });
    
    // Get unique case_ids
    const caseIdsWithVictims = [...new Set(casesWithVictims.map(cp => cp.case_id))];
    
    console.log(`Found ${caseIdsWithVictims.length} cases with Victim role`);
    
    // If no cases have victims, return empty array
    if (caseIdsWithVictims.length === 0) {
      console.log('No cases found with Victim role, returning empty list');
      return res.json([]);
    }
    
    // Only fetch cases that have at least one Victim
    const cases = await req.prisma.cac_case.findMany({
      where: {
        case_id: {
          in: caseIdsWithVictims
        }
      },
      select: {
        case_id: true,
        case_number: true,
        cac_id: true,
        case_person: {
          where: {
            role_id: 1 // Only get the Alleged Co-victim person
          },
          take: 1, // Take just the first victim associated with each case
          select: {
            person_id: true,
            person: {
              select: {
                first_name: true,
                last_name: true
              }
            },
            role_id: true
          },
          orderBy: {
            person_id: 'asc' // Consistent ordering
          }
        },
        child_advocacy_center: {
          select: {
            cac_name: true
          }
        }
      },
      orderBy: {
        case_id: 'desc'
      },
      take: 20 // Limit to recent 20 cases
    });
    
    console.log('Raw cases from database:', JSON.stringify(cases, null, 2));
    
    console.log(`Retrieved ${cases.length} cases from database`);
    
    // Format the response for the dropdown
    const formattedCases = cases.map(c => {
      // Extract person info if available
      const casePerson = c.case_person?.[0];
      const person = casePerson?.person;
      let displayName = 'Unknown Person';
      let personId = null;
      
      if (person) {
        displayName = `${person.last_name || ''}, ${person.first_name || ''}`;
        personId = casePerson.person_id;
      }
      
      const formattedCase = {
        id: c.case_id.toString(),
        name: displayName,
        number: c.case_number || `#${c.case_id}`,
        cacName: c.child_advocacy_center?.cac_name || `CAC ID: ${c.cac_id}`,
        personId: personId
      };
      
      console.log(`Case ${c.case_id}: personId = ${personId}, displayName = ${displayName}`);
      
      return formattedCase;
    });
    
    res.json(formattedCases);
  } catch (error) {
    console.error('Error fetching cases list:', error);
    next(error);
  }
});

/**
 * @route GET /api/cases/:id
 * @desc Get a case by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    // Check if id parameter exists
    if (!req.params.id) {
      return res.status(400).json({ message: 'Case ID is required' });
    }
    
    // Parse the id parameter with better error handling
    let caseId;
    try {
      caseId = parseInt(req.params.id, 10);
      
      // Check if parsing resulted in a valid number
      if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid case ID format' });
      }
    } catch (parseError) {
      console.error('Error parsing case ID:', parseError);
      return res.status(400).json({ message: 'Invalid case ID format' });
    }
    
    console.log(`Looking up case with ID: ${caseId}`);
    
    const caseData = await req.prisma.cac_case.findUnique({
      where: { case_id: caseId },
      include: {
        child_advocacy_center: true,
        cac_agency_cac_case_mh_agency_idTocac_agency: true,
        cac_agency_cac_case_mh_referral_agency_idTocac_agency: true,
        cac_agency_cac_case_va_agency_idTocac_agency: true,
        cac_agency_cac_case_va_referral_agency_idTocac_agency: true,
        case_person: {
          include: {
            person: true
          }
        }
      }
    });

    if (!caseData) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Serialize top-level date fields as YYYY-MM-DD strings
    const serializedCase = {
      ...caseData,
      cac_received_date: caseData.cac_received_date ? caseData.cac_received_date.toISOString().slice(0, 10) : null,
      case_closed_date: caseData.case_closed_date ? caseData.case_closed_date.toISOString().slice(0, 10) : null,
      created_date: caseData.created_date ? caseData.created_date.toISOString().slice(0, 10) : null
    };

    res.json(serializedCase);
  } catch (error) {
    console.error('Error fetching case by ID:', error);
    next(error);
  }
});
/**
 * @route POST /api/cases
 * @desc Create a new case
 */
router.post('/', async (req, res, next) => {
  try {
    // Validate required fields
    const { cac_id, cac_received_date } = req.body;
    if (!cac_id) {
      return res.status(400).json({ 
        message: 'cac_id is required' 
      });
    }
    
    // Generate case_id if not provided
    let case_id = req.body.case_id;
    if (!case_id) {
      const maxCase = await req.prisma.cac_case.findFirst({
        orderBy: { case_id: 'desc' },
        select: { case_id: true }
      });
      case_id = maxCase ? maxCase.case_id + 1 : 1;
    }
    
    // Generate case_number if not provided
    let case_number = req.body.case_number;
    if (!case_number) {
      // ⭐ New format: YYYYNNN (Year + Sequence Number)
      // Examples: 202047 (2020 + 47), 19964 (1996 + 4), 201827 (2018 + 27)
      const currentYear = new Date().getFullYear();
      const yearPrefix = currentYear.toString();
      
      // Find all cases with case_number starting with current year
      // Get all cases and filter by case_number prefix (Prisma doesn't support startsWith in where clause directly)
      const allCases = await req.prisma.cac_case.findMany({
        select: {
          case_number: true
        }
      });
      
      // Filter cases that start with current year prefix
      const casesThisYear = allCases.filter(c => 
        c.case_number && c.case_number.startsWith(yearPrefix)
      );
      
      // Extract sequence numbers from case_numbers that match YYYYNNN format
      let maxSequence = 0;
      
      casesThisYear.forEach(c => {
        // Extract the sequence part (everything after the year)
        const sequencePart = c.case_number.substring(yearPrefix.length);
        // Check if it's a valid number
        const sequenceNum = parseInt(sequencePart, 10);
        if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
          maxSequence = sequenceNum;
        }
      });
      
      // Generate new sequence number (increment by 1)
      const newSequence = maxSequence + 1;
      
      // Format: YYYY + NNN (no padding, natural number)
      // Examples: 20201, 202047, 201827
      case_number = `${yearPrefix}${newSequence}`;
      
      console.log(`Generated case_number: ${case_number} (Year: ${currentYear}, Sequence: ${newSequence}, Max found: ${maxSequence})`);
    }
    
    // Parse received date (default to today if missing or invalid)
    const parseDateSafely = (value) => {
      if (!value) return null;
      const direct = new Date(value);
      if (!isNaN(direct.getTime())) {
        return direct;
      }

      // Try parsing MM/DD/YYYY
      if (typeof value === 'string') {
        const normalized = value.trim();
        // MM/DD/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)) {
          const [month, day, year] = normalized.split('/').map(Number);
          const parsed = new Date(year, month - 1, day);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }

        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          const [year, month, day] = normalized.split('-').map(Number);
          const parsed = new Date(year, month - 1, day);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }

      return null;
    };

    const parsedReceivedDate = parseDateSafely(cac_received_date) || new Date();

    // Validate CAC exists
    const cacExists = await req.prisma.child_advocacy_center.findUnique({
      where: { cac_id: parseInt(cac_id) }
    });
    
    if (!cacExists) {
      return res.status(400).json({ 
        message: 'Invalid CAC ID provided' 
      });
    }
    
    const newCase = await req.prisma.cac_case.create({
      data: {
        case_id: parseInt(case_id),
        cac_id: parseInt(cac_id),
        cac_received_date: parsedReceivedDate,
        case_number: case_number,
        created_date: req.body.created_date ? new Date(req.body.created_date) : new Date()
      }
    });
    
    res.status(201).json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    next(error);
  }
});

/**
 * @route PUT /api/cases/:id
 * @desc Update a case
 * 
 * Fix Notes:
 * - Previously only supported partial field updates (missing case_number, MH-related fields, etc.)
 * - Now supports updating all fields in the cac_case model
 * - Uses conditional checks to only update fields provided in the request, avoiding overwriting unmodified data
 * - Performs safe conversion for date fields
 * - Validates foreign key fields to ensure referenced records exist
 * 
 * Supported update field range:
 * - Basic fields: case_number, cac_received_date, case_closed_date, closed_reason_id, created_date, cac_id
 * - Mental Health (MH) fields: mh_lead_employee_id, mh_agency_id, mh_case_number, mh_mdt_ready, mh_na,
 *   mh_referral_agency_id, mh_referral_date, mh_therapy_accepted, mh_therapy_complete_date,
 *   mh_therapy_end_reason_id, mh_therapy_offered_date, mh_therapy_record_created
 * - Victim Advocacy (VA) fields: va_agency_id, va_case_number, va_claim_denied_reason, va_claim_number,
 *   va_claim_status_id, va_have_birth_cert, va_has_police_report, va_mdt_ready, va_na,
 *   va_referral_agency_id, va_referral_date, va_services_accepted, va_services_offered_date, va_services_end_date
 */
router.put('/:id', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id);
    
    // Validate case ID
    if (isNaN(caseId)) {
      return res.status(400).json({ message: 'Invalid case ID format' });
    }
    
    // Check if case exists
    const existingCase = await req.prisma.cac_case.findUnique({
      where: { case_id: caseId }
    });
    
    if (!existingCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    // Helper function to safely convert date strings to Date objects
    const parseDate = (dateValue) => {
      if (dateValue === null || dateValue === undefined || dateValue === '') {
        return null;
      }
      if (dateValue instanceof Date) {
        return dateValue;
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };
    
    // Build update payload - only include fields that are provided in the request
    // This prevents accidentally overwriting fields with undefined/null values
    const updateData = {};
    
    // Basic fields
    if (req.body.case_number !== undefined) updateData.case_number = req.body.case_number;
    if (req.body.cac_received_date !== undefined) updateData.cac_received_date = parseDate(req.body.cac_received_date);
    if (req.body.case_closed_date !== undefined) updateData.case_closed_date = parseDate(req.body.case_closed_date);
    if (req.body.closed_reason_id !== undefined) updateData.closed_reason_id = req.body.closed_reason_id;
    if (req.body.created_date !== undefined) updateData.created_date = parseDate(req.body.created_date);
    if (req.body.cac_id !== undefined) {
      // Validate CAC exists if cac_id is being updated
      const cacExists = await req.prisma.child_advocacy_center.findUnique({
        where: { cac_id: parseInt(req.body.cac_id) }
      });
      if (!cacExists) {
        return res.status(400).json({ message: 'Invalid CAC ID provided' });
      }
      updateData.cac_id = parseInt(req.body.cac_id);
    }
    
    // Mental Health (MH) fields
    if (req.body.mh_lead_employee_id !== undefined) updateData.mh_lead_employee_id = req.body.mh_lead_employee_id;
    if (req.body.mh_agency_id !== undefined) {
      // Validate agency exists if mh_agency_id is being updated
      if (req.body.mh_agency_id !== null) {
        const agencyExists = await req.prisma.cac_agency.findUnique({
          where: { agency_id: parseInt(req.body.mh_agency_id) }
        });
        if (!agencyExists) {
          return res.status(400).json({ message: 'Invalid MH agency ID provided' });
        }
        updateData.mh_agency_id = parseInt(req.body.mh_agency_id);
      } else {
        updateData.mh_agency_id = null;
      }
    }
    if (req.body.mh_case_number !== undefined) updateData.mh_case_number = req.body.mh_case_number;
    if (req.body.mh_mdt_ready !== undefined) updateData.mh_mdt_ready = req.body.mh_mdt_ready;
    if (req.body.mh_na !== undefined) updateData.mh_na = req.body.mh_na;
    if (req.body.mh_referral_agency_id !== undefined) {
      console.log('[cases.js] Processing mh_referral_agency_id:', {
        value: req.body.mh_referral_agency_id,
        type: typeof req.body.mh_referral_agency_id,
        isNull: req.body.mh_referral_agency_id === null,
        isUndefined: req.body.mh_referral_agency_id === undefined
      });
      if (req.body.mh_referral_agency_id !== null && req.body.mh_referral_agency_id !== '') {
        const agencyId = parseInt(req.body.mh_referral_agency_id);
        const agencyExists = await req.prisma.cac_agency.findUnique({
          where: { agency_id: agencyId }
        });
        if (!agencyExists) {
          console.error('[cases.js] Invalid MH referral agency ID:', agencyId);
          return res.status(400).json({ message: 'Invalid MH referral agency ID provided' });
        }
        updateData.mh_referral_agency_id = agencyId;
        console.log('[cases.js] Set mh_referral_agency_id to:', agencyId);
      } else {
        updateData.mh_referral_agency_id = null;
        console.log('[cases.js] Set mh_referral_agency_id to null');
      }
    } else {
      console.log('[cases.js] mh_referral_agency_id is undefined, skipping update');
    }
    if (req.body.mh_referral_date !== undefined) updateData.mh_referral_date = parseDate(req.body.mh_referral_date);
    if (req.body.mh_referral_source !== undefined) updateData.mh_referral_source = req.body.mh_referral_source || null;
    if (req.body.mh_therapy_accepted !== undefined) updateData.mh_therapy_accepted = req.body.mh_therapy_accepted;
    if (req.body.mh_therapy_complete_date !== undefined) updateData.mh_therapy_complete_date = parseDate(req.body.mh_therapy_complete_date);
    if (req.body.mh_therapy_end_reason_id !== undefined) updateData.mh_therapy_end_reason_id = req.body.mh_therapy_end_reason_id;
    if (req.body.mh_therapy_offered_date !== undefined) updateData.mh_therapy_offered_date = parseDate(req.body.mh_therapy_offered_date);
    if (req.body.mh_therapy_record_created !== undefined) updateData.mh_therapy_record_created = req.body.mh_therapy_record_created;
    
    // Victim Advocacy (VA) fields
    if (req.body.va_agency_id !== undefined) {
      if (req.body.va_agency_id !== null) {
        const agencyExists = await req.prisma.cac_agency.findUnique({
          where: { agency_id: parseInt(req.body.va_agency_id) }
        });
        if (!agencyExists) {
          return res.status(400).json({ message: 'Invalid VA agency ID provided' });
        }
        updateData.va_agency_id = parseInt(req.body.va_agency_id);
      } else {
        updateData.va_agency_id = null;
      }
    }
    if (req.body.va_case_number !== undefined) updateData.va_case_number = req.body.va_case_number;
    if (req.body.va_claim_denied_reason !== undefined) updateData.va_claim_denied_reason = req.body.va_claim_denied_reason;
    if (req.body.va_claim_number !== undefined) updateData.va_claim_number = req.body.va_claim_number;
    if (req.body.va_claim_status_id !== undefined) updateData.va_claim_status_id = req.body.va_claim_status_id;
    if (req.body.va_have_birth_cert !== undefined) updateData.va_have_birth_cert = req.body.va_have_birth_cert;
    if (req.body.va_has_police_report !== undefined) updateData.va_has_police_report = req.body.va_has_police_report;
    if (req.body.va_mdt_ready !== undefined) updateData.va_mdt_ready = req.body.va_mdt_ready;
    if (req.body.va_na !== undefined) updateData.va_na = req.body.va_na;
    if (req.body.va_referral_agency_id !== undefined) {
      if (req.body.va_referral_agency_id !== null) {
        const agencyExists = await req.prisma.cac_agency.findUnique({
          where: { agency_id: parseInt(req.body.va_referral_agency_id) }
        });
        if (!agencyExists) {
          return res.status(400).json({ message: 'Invalid VA referral agency ID provided' });
        }
        updateData.va_referral_agency_id = parseInt(req.body.va_referral_agency_id);
      } else {
        updateData.va_referral_agency_id = null;
      }
    }
    if (req.body.va_referral_date !== undefined) updateData.va_referral_date = parseDate(req.body.va_referral_date);
    if (req.body.va_services_accepted !== undefined) updateData.va_services_accepted = req.body.va_services_accepted;
    if (req.body.va_services_offered_date !== undefined) updateData.va_services_offered_date = parseDate(req.body.va_services_offered_date);
    if (req.body.va_services_end_date !== undefined) updateData.va_services_end_date = parseDate(req.body.va_services_end_date);
    
    // Case Manager and MDT Meeting Types fields
    if (req.body.case_manager_agency !== undefined) {
      updateData.case_manager_agency = req.body.case_manager_agency && req.body.case_manager_agency.length > 255 
        ? req.body.case_manager_agency.substring(0, 255) 
        : req.body.case_manager_agency;
    }
    if (req.body.case_manager !== undefined) {
      updateData.case_manager = req.body.case_manager && req.body.case_manager.length > 255 
        ? req.body.case_manager.substring(0, 255) 
        : req.body.case_manager;
    }
    if (req.body.mdt_meeting_types !== undefined) {
      updateData.mdt_meeting_types = req.body.mdt_meeting_types;
    }
    
    // If no fields to update, return existing case
    if (Object.keys(updateData).length === 0) {
      return res.json(existingCase);
    }
    
    // Log update data before performing update
    console.log('[cases.js] Updating case:', {
      caseId: caseId,
      updateData: updateData,
      updateDataKeys: Object.keys(updateData),
      mh_referral_agency_id: updateData.mh_referral_agency_id
    });
    
    // Perform the update
    const updatedCase = await req.prisma.cac_case.update({
      where: { case_id: caseId },
      data: updateData,
      include: {
        child_advocacy_center: true,
        cac_agency_cac_case_mh_agency_idTocac_agency: true,
        cac_agency_cac_case_mh_referral_agency_idTocac_agency: true,
        cac_agency_cac_case_va_agency_idTocac_agency: true,
        cac_agency_cac_case_va_referral_agency_idTocac_agency: true
      }
    });
    
    res.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    next(error);
  }
});

/**
 * @route DELETE /api/cases/:id
 * @desc Delete a case
 * 
 * Fix Notes:
 * - Previously directly deleted case, which would fail due to foreign key constraints (onDelete: NoAction)
 * - Now checks all related records before deletion and provides detailed error information
 * - If related records exist, returns 400 error listing all related record types
 * - If no related records, safely deletes the case
 * 
 * Foreign key relationship handling:
 * - Cannot cascade delete due to onDelete: NoAction in schema
 * - Uses "hard delete" approach: check related records → prevent deletion if found → delete if none
 * - Related tables include: case_person, case_mh_assessment, case_va_session_log, etc.
 * - For cascade delete, need to manually delete all related records first, or modify schema to set onDelete: Cascade
 * 
 * Delete method: Hard delete (physical delete)
 * - If successful, returns { success: true, message: "Case deleted successfully" }
 * - If related records exist, returns 400 error with related record details
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id);
    
    // Validate case ID
    if (isNaN(caseId)) {
      return res.status(400).json({ message: 'Invalid case ID format' });
    }
    
    // Check if case exists
    const existingCase = await req.prisma.cac_case.findUnique({
      where: { case_id: caseId }
    });
    
    if (!existingCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    // Check for related records that would prevent deletion due to foreign key constraints
    // Since schema uses onDelete: NoAction, we need to check all related tables
    const relatedRecords = {};
    let hasRelatedRecords = false;
    
    // Check case_person
    const casePersons = await req.prisma.case_person.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (casePersons.length > 0) {
      relatedRecords.case_person = casePersons.length;
      hasRelatedRecords = true;
    }
    
    // Check case_mh_assessment
    const mhAssessments = await req.prisma.case_mh_assessment.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (mhAssessments.length > 0) {
      relatedRecords.case_mh_assessment = mhAssessments.length;
      hasRelatedRecords = true;
    }
    
    // Check case_va_session_log
    const vaSessionLogs = await req.prisma.case_va_session_log.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (vaSessionLogs.length > 0) {
      relatedRecords.case_va_session_log = vaSessionLogs.length;
      hasRelatedRecords = true;
    }
    
    // Check case_mh_session_log_enc
    const mhSessionLogs = await req.prisma.case_mh_session_log_enc.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (mhSessionLogs.length > 0) {
      relatedRecords.case_mh_session_log_enc = mhSessionLogs.length;
      hasRelatedRecords = true;
    }
    
    // Check case_mh_treatment_plans
    const treatmentPlans = await req.prisma.case_mh_treatment_plans.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (treatmentPlans.length > 0) {
      relatedRecords.case_mh_treatment_plans = treatmentPlans.length;
      hasRelatedRecords = true;
    }
    
    // Check case_mh_provider
    const mhProviders = await req.prisma.case_mh_provider.findMany({
      where: { case_id: caseId },
      take: 1
    });
    if (mhProviders.length > 0) {
      relatedRecords.case_mh_provider = mhProviders.length;
      hasRelatedRecords = true;
    }
    
    // If there are related records, prevent deletion and return detailed error
    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete case: it has related records that must be deleted first',
        relatedRecords: relatedRecords,
        suggestion: 'Please delete all related records (case_person, assessments, session logs, etc.) before deleting this case'
      });
    }
    
    // Safe to delete - no related records found
    await req.prisma.cac_case.delete({
      where: { case_id: caseId }
    });
    
    res.json({
      success: true,
      message: 'Case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting case:', error);
    
    // Handle Prisma foreign key constraint errors
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete case: foreign key constraint violation',
        error: 'This case has related records that prevent deletion'
      });
    }
    
    next(error);
  }
});

/**
 * ============================================================================
 * CRUD Functionality Summary
 * ============================================================================
 * 
 * ✅ CREATE (POST /api/cases)
 *    - Fully implemented, supports creating new case
 *    - Auto-generates case_id and case_number (if not provided)
 *    - Validates CAC ID existence
 * 
 * ✅ READ (GET /api/cases, GET /api/cases/list, GET /api/cases/:id)
 *    - Fully implemented, supports getting all cases, simplified list, single case details
 *    - Includes related data (person, agencies, center)
 * 
 * ✅ UPDATE (PUT /api/cases/:id)
 *    - Fully implemented, supports updating all fields in cac_case model
 *    - Supported field range:
 *      * Basic fields: case_number, cac_received_date, case_closed_date, closed_reason_id, created_date, cac_id
 *      * MH fields: mh_lead_employee_id, mh_agency_id, mh_case_number, mh_mdt_ready, mh_na,
 *        mh_referral_agency_id, mh_referral_date, mh_therapy_accepted, mh_therapy_complete_date,
 *        mh_therapy_end_reason_id, mh_therapy_offered_date, mh_therapy_record_created
 *      * VA fields: va_agency_id, va_case_number, va_claim_denied_reason, va_claim_number,
 *        va_claim_status_id, va_have_birth_cert, va_has_police_report, va_mdt_ready, va_na,
 *        va_referral_agency_id, va_referral_date, va_services_accepted, va_services_offered_date,
 *        va_services_end_date
 *    - Only updates fields provided in request, avoiding overwriting unmodified data
 *    - Validates foreign key fields (cac_id, agency_id)
 *    - Performs safe conversion for date fields
 * 
 * ✅ DELETE (DELETE /api/cases/:id)
 *    - Fully implemented, uses hard delete (physical delete) method
 *    - Checks all related records before deletion (case_person, case_mh_assessment, case_va_session_log, etc.)
 *    - If related records exist, returns 400 error with detailed related record information
 *    - If no related records, safely deletes case
 *    - Foreign key constraint handling: Due to onDelete: NoAction in schema, uses check-then-delete approach
 *    - For cascade delete, need to manually delete all related records first, or modify schema to set onDelete: Cascade
 * 
 * ============================================================================
 */

export default router;