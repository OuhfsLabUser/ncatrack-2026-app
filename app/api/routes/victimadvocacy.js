// src/api/routes/victimsadvocacy.js
import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/va/sessions/case/:caseId
 * @desc Get all VA sessions for a case
 */
router.get('/sessions/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    
    // Validate caseId
    if (isNaN(caseId) || caseId <= 0) {
      return res.status(400).json({ 
        error: 'Invalid case ID',
        received: req.params.caseId,
        parsed: caseId
      });
    }

    console.log(`[VA Sessions API] Fetching sessions for case_id: ${caseId}`);
    
    const sessions = await req.prisma.case_va_session_log.findMany({
      where: { case_id: caseId },
      orderBy: {
        session_date: 'desc'
      }
    });
    
    console.log(`[VA Sessions API] Found ${sessions.length} sessions for case_id: ${caseId}`);
    
    res.json(sessions);
  } catch (error) {
    console.error('[VA Sessions API] Error:', error);
    next(error);
  }
});

/**
 * @route GET /api/va/sessions/:id
 * @desc Get a VA session by id
 */
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await req.prisma.case_va_session_log.findUnique({
      where: { case_va_session_id: sessionId }
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/va/sessions
 * @desc Create a new VA session
 */
router.post('/sessions', async (req, res, next) => {
  try {
    // Get maximum session ID
    const maxSessionIdResult = await req.prisma.case_va_session_log.findFirst({
      orderBy: {
        case_va_session_id: 'desc'
      },
      select: {
        case_va_session_id: true
      }
    });
    
    const newSessionId = maxSessionIdResult ? maxSessionIdResult.case_va_session_id + 1 : 1;
    
    const newSession = await req.prisma.case_va_session_log.create({
      data: {
        case_va_session_id: newSessionId,
        cac_id: req.body.cac_id,
        case_id: req.body.case_id,
        start_time: req.body.start_time ? new Date(req.body.start_time) : null,
        end_time: req.body.end_time ? new Date(req.body.end_time) : null,
        va_provider_agency_id: req.body.va_provider_agency_id,
        session_date: req.body.session_date,
        session_status: req.body.session_status
      }
    });
    
    res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/va/sessions/:id
 * @desc Update a VA session
 */
router.put('/sessions/:id', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    const updatedSession = await req.prisma.case_va_session_log.update({
      where: { case_va_session_id: sessionId },
      data: {
        start_time: req.body.start_time ? new Date(req.body.start_time) : null,
        end_time: req.body.end_time ? new Date(req.body.end_time) : null,
        va_provider_agency_id: req.body.va_provider_agency_id,
        session_date: req.body.session_date,
        session_status: req.body.session_status
      }
    });
    
    res.json(updatedSession);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/va/sessions/:id
 * @desc Delete a VA session
 */
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    // Due to foreign key constraints, we need to delete related records first
    await req.prisma.case_va_session_service.deleteMany({
      where: { case_va_session_id: sessionId }
    });
    
    await req.prisma.case_va_session_attendee.deleteMany({
      where: { case_va_session_id: sessionId }
    });
    
    await req.prisma.case_va_session_log.delete({
      where: { case_va_session_id: sessionId }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/va/sessions/:id/attendees
 * @desc Get all attendees for a VA session
 */
router.get('/sessions/:id/attendees', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    const attendees = await req.prisma.case_va_session_attendee.findMany({
      where: { case_va_session_id: sessionId },
      include: {
        person: true
      }
    });
    
    res.json(attendees);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/va/sessions/:id/attendees
 * @desc Add an attendee to a VA session
 */
router.post('/sessions/:id/attendees', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    // Get maximum attendee ID
    const maxAttendeeIdResult = await req.prisma.case_va_session_attendee.findFirst({
      orderBy: {
        case_va_session_attendee_id: 'desc'
      },
      select: {
        case_va_session_attendee_id: true
      }
    });
    
    const newAttendeeId = maxAttendeeIdResult ? maxAttendeeIdResult.case_va_session_attendee_id + 1 : 1;
    
    const newAttendee = await req.prisma.case_va_session_attendee.create({
      data: {
        case_va_session_attendee_id: newAttendeeId,
        case_id: req.body.case_id,
        case_va_session_id: sessionId,
        person_id: req.body.person_id
      }
    });
    
    res.status(201).json(newAttendee);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/va/sessions/:id/services
 * @desc Get all services for a VA session
 */
router.get('/sessions/:id/services', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    const services = await req.prisma.case_va_session_service.findMany({
      where: { case_va_session_id: sessionId },
      orderBy: {
        service_type_id: 'desc'
      }
    });
    
    res.json(services);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/va/sessions/:id/services
 * @desc Add a service to a VA session
 */
router.post('/sessions/:id/services', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    // Get maximum service ID
    const maxServiceIdResult = await req.prisma.case_va_session_service.findFirst({
      orderBy: {
        case_va_session_service_id: 'desc'
      },
      select: {
        case_va_session_service_id: true
      }
    });
    
    const newServiceId = maxServiceIdResult ? maxServiceIdResult.case_va_session_service_id + 1 : 1;
    
    const newService = await req.prisma.case_va_session_service.create({
      data: {
        case_va_session_service_id: newServiceId,
        cac_id: req.body.cac_id,
        case_va_session_id: sessionId,
        service_type_id: req.body.service_type_id
      }
    });
    
    res.status(201).json(newService);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/va/case/:id
 * @desc Update VA-specific case information
 */
router.put('/case/:id', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id);
    
    const updatedCase = await req.prisma.cac_case.update({
      where: { case_id: caseId },
      data: {
        va_agency_id: req.body.va_agency_id,
        va_case_number: req.body.va_case_number,
        va_claim_denied_reason: req.body.va_claim_denied_reason,
        va_claim_number: req.body.va_claim_number,
        va_claim_status_id: req.body.va_claim_status_id,
        va_have_birth_cert: req.body.va_have_birth_cert,
        va_has_police_report: req.body.va_has_police_report,
        va_mdt_ready: req.body.va_mdt_ready,
        va_na: req.body.va_na,
        va_referral_agency_id: req.body.va_referral_agency_id,
        va_referral_date: req.body.va_referral_date,
        va_services_accepted: req.body.va_services_accepted,
        va_services_offered_date: req.body.va_services_offered_date,
        va_services_end_date: req.body.va_services_end_date
      }
    });
    
    res.json(updatedCase);
  } catch (error) {
    next(error);
  }
});

export default router;