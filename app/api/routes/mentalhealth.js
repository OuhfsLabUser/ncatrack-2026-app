// src/api/routes/mentalhealth.js
import { Router } from 'express';

const router = Router();

// ----- Assessment Instruments -----

/**
 * @route GET /api/mentalhealth/assessment-instruments
 * @desc Get all assessment instruments with measure counts
 */
router.get('/assessment-instruments', async (req, res, next) => {
  try {
    const instruments = await req.prisma.case_mh_assessment_instrument.findMany({
      include: {
        _count: {
          select: {
            case_mh_instrument_measure: true
          }
        }
      }
    });
    
    // Map instruments to include measure count and source
    const instrumentsWithCounts = instruments.map(instrument => ({
      instrument_id: instrument.instrument_id,
      assessment_name: instrument.assessment_name,
      instrument_scores: instrument.instrument_scores,
      source: 'NCA', // Default source, can be updated if source field exists
      measure_count: instrument._count?.case_mh_instrument_measure || 0
    }));
    
    res.json(instrumentsWithCounts);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/assessment-instruments/:name
 * @desc Get an assessment instrument by name
 */
router.get('/assessment-instruments/:name', async (req, res, next) => {
  try {
    const instrumentName = req.params.name;
    const instrument = await req.prisma.case_mh_assessment_instrument.findFirst({
      where: {
        assessment_name: {
          equals: instrumentName,
          mode: 'insensitive'
        }
      }
    });
    
    if (!instrument) {
      return res.status(404).json({ message: 'Assessment instrument not found' });
    }
    
    res.json(instrument);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/assessment-instruments
 * @desc Create a new assessment instrument
 */
router.post('/assessment-instruments', async (req, res, next) => {
  try {
    // Get maximum instrument ID
    const maxInstrumentIdResult = await req.prisma.case_mh_assessment_instrument.findFirst({
      orderBy: {
        instrument_id: 'desc'
      },
      select: {
        instrument_id: true
      }
    });
    
    const newInstrumentId = maxInstrumentIdResult ? maxInstrumentIdResult.instrument_id + 1 : 1;
    
    const newInstrument = await req.prisma.case_mh_assessment_instrument.create({
      data: {
        instrument_id: newInstrumentId,
        assessment_name: req.body.assessment_name,
        instrument_scores: req.body.instrument_scores
      }
    });
    
    res.status(201).json(newInstrument);
  } catch (error) {
    next(error);
  }
});


// ----- Instrument Measures -----

/**
 * @route GET /api/mentalhealth/instruments/:instrumentId/measures
 * @desc Get all measures for an instrument
 */
router.get('/instruments/:instrumentId/measures', async (req, res, next) => {
  try {
    const instrumentId = parseInt(req.params.instrumentId);
    
    if (isNaN(instrumentId) || instrumentId <= 0) {
      return res.status(400).json({ message: 'Invalid instrument ID' });
    }
    
    const measures = await req.prisma.case_mh_instrument_measure.findMany({
      where: { instrument_id: instrumentId },
      orderBy: { sequence: 'asc' }
    });
    
    // Map to frontend-friendly format: { id: measure_id, name: measure_name, ... }
    const mappedMeasures = measures.map(measure => ({
      id: measure.measure_id,
      measure_id: measure.measure_id,
      name: measure.measure_name,
      measure_name: measure.measure_name,
      instrument_id: measure.instrument_id,
      sequence: measure.sequence
    }));
    
    res.json(mappedMeasures);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/instruments/:instrumentId/measures
 * @desc Create a new measure for an instrument
 */
router.post('/instruments/:instrumentId/measures', async (req, res, next) => {
  try {
    const instrumentId = parseInt(req.params.instrumentId);
    
    if (isNaN(instrumentId) || instrumentId <= 0) {
      return res.status(400).json({ message: 'Invalid instrument ID' });
    }

    const { measure_name, description, sequence } = req.body;

    if (!measure_name) {
      return res.status(400).json({ message: 'Measure name is required' });
    }

    // Get max sequence for this instrument if sequence not provided
    let measureSequence = sequence;
    if (measureSequence === undefined || measureSequence === null) {
      const maxSequenceResult = await req.prisma.case_mh_instrument_measure.findFirst({
        where: { instrument_id: instrumentId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true }
      });
      measureSequence = maxSequenceResult ? (maxSequenceResult.sequence || 0) + 1 : 0;
    }

    const newMeasure = await req.prisma.case_mh_instrument_measure.create({
      data: {
        instrument_id: instrumentId,
        measure_name: measure_name,
        sequence: measureSequence
      }
    });

    // Map to frontend-friendly format
    const mappedMeasure = {
      id: newMeasure.measure_id,
      measure_id: newMeasure.measure_id,
      name: newMeasure.measure_name,
      measure_name: newMeasure.measure_name,
      description: description || newMeasure.measure_name, // Use measure_name as description if not provided
      instrument_id: newMeasure.instrument_id,
      sequence: newMeasure.sequence
    };

    res.status(201).json(mappedMeasure);
  } catch (error) {
    next(error);
  }
});

// ----- Assessments -----

/**
 * @route GET /api/mentalhealth/assessments/case/:caseId
 * @desc Get all assessments for a case
 */
router.get('/assessments/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    const assessments = await req.prisma.case_mh_assessment.findMany({
      where: { case_id: caseId },
      include: {
        case_mh_assessment_instrument: true,
        employee: true,
        case_mh_assessment_measure_scores: {
          include: {
            measure: true
          }
        }
      }
    });
    
    res.json(assessments);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/assessments/:id
 * @desc Get an assessment by id
 */
router.get('/assessments/:id', async (req, res, next) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const assessment = await req.prisma.case_mh_assessment.findUnique({
      where: { assessment_id: assessmentId },
      include: {
        case_mh_assessment_instrument: true,
        employee: true,
        cac_agency_case_mh_assessment_mh_provider_agency_idTocac_agency: true,
        case_mh_assessment_measure_scores: {
          include: {
            measure: true
          }
        }
      }
    });
    
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    res.json(assessment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/assessments/:assessmentId/scores
 * @desc Get all scores for an assessment
 */
router.get('/assessments/:assessmentId/scores', async (req, res, next) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId);
    
    if (isNaN(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({ message: 'Invalid assessment ID' });
    }
    
    const scores = await req.prisma.case_mh_assessment_measure_scores.findMany({
      where: { assessment_id: assessmentId },
      include: {
        measure: true
      }
    });
    
    // Map to frontend-friendly format
    const mappedScores = scores.map(score => ({
      score_id: score.score_id,
      measure_id: score.measure_id,
      score_value: score.mh_assessment_scores,
      mh_assessment_scores: score.mh_assessment_scores
    }));
    
    res.json(mappedScores);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/assessments/:assessmentId/scores
 * @desc Save or update scores for an assessment
 */
router.post('/assessments/:assessmentId/scores', async (req, res, next) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId);
    
    if (isNaN(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({ message: 'Invalid assessment ID' });
    }
    
    // Get the assessment to get case_id, cac_id, and assessment_instrument_id
    const assessment = await req.prisma.case_mh_assessment.findUnique({
      where: { assessment_id: assessmentId },
      select: {
        case_id: true,
        cac_id: true,
        assessment_instrument_id: true
      }
    });
    
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    // Validate that assessment has required fields
    if (!assessment.case_id || !assessment.cac_id || !assessment.assessment_instrument_id) {
      return res.status(400).json({ 
        message: 'Assessment is missing required fields (case_id, cac_id, or assessment_instrument_id)' 
      });
    }
    
    const scoresArray = req.body; // Array of { measure_id, score_value }
    
    if (!Array.isArray(scoresArray)) {
      return res.status(400).json({ message: 'Scores must be an array' });
    }
    
    // Get maximum score ID for new scores
    const maxScoreIdResult = await req.prisma.case_mh_assessment_measure_scores.findFirst({
      orderBy: { score_id: 'desc' },
      select: { score_id: true }
    });
    
    let nextScoreId = maxScoreIdResult ? maxScoreIdResult.score_id + 1 : 1;
    
    const results = [];
    
    for (const scoreData of scoresArray) {
      const { measure_id, score_value } = scoreData;
      
      if (!measure_id) {
        continue; // Skip invalid entries
      }
      
      const scoreValue = score_value !== undefined && score_value !== null && score_value !== "" 
        ? String(score_value).trim() 
        : null;
      
      // Check if score already exists for this assessment and measure
      const existingScore = await req.prisma.case_mh_assessment_measure_scores.findFirst({
        where: {
          assessment_id: assessmentId,
          measure_id: parseInt(measure_id)
        }
      });
      
      if (existingScore) {
        // Update existing score
        const updated = await req.prisma.case_mh_assessment_measure_scores.update({
          where: { score_id: existingScore.score_id },
          data: {
            mh_assessment_scores: scoreValue
          }
        });
        results.push(updated);
      } else if (scoreValue !== null) {
        // Create new score only if score_value is not null/empty
        // Validate that assessment_instrument_id exists
        if (!assessment.assessment_instrument_id) {
          throw new Error('Assessment is missing assessment_instrument_id');
        }
        
        const created = await req.prisma.case_mh_assessment_measure_scores.create({
          data: {
            score_id: nextScoreId++,
            cac_id: assessment.cac_id,
            case_id: assessment.case_id,
            assessment_id: assessmentId,
            instrument_id: assessment.assessment_instrument_id,
            measure_id: parseInt(measure_id),
            mh_assessment_scores: scoreValue
          }
        });
        results.push(created);
      }
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error saving assessment scores:', error);
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/assessments
 * @desc Create a new assessment
 */
router.post('/assessments', async (req, res, next) => {
  try {
    // Get maximum assessment ID
    const maxAssessmentIdResult = await req.prisma.case_mh_assessment.findFirst({
      orderBy: {
        assessment_id: 'desc'
      },
      select: {
        assessment_id: true
      }
    });
    
    const newAssessmentId = maxAssessmentIdResult ? maxAssessmentIdResult.assessment_id + 1 : 1;
    
    const newAssessment = await req.prisma.case_mh_assessment.create({
      data: {
        assessment_id: newAssessmentId,
        cac_id: req.body.cac_id,
        case_id: req.body.case_id,
        agency_id: req.body.agency_id,
        mh_provider_agency_id: req.body.mh_provider_agency_id,
        assessment_instrument_id: req.body.assessment_instrument_id,
        provider_employee_id: req.body.provider_employee_id,
        timing_id: req.body.timing_id,
        session_date: req.body.session_date,
        assessment_date: req.body.assessment_date,
        comments: req.body.comments
      }
    });
    
    res.status(201).json(newAssessment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/mentalhealth/assessments/:id
 * @desc Update an existing assessment
 */
router.put('/assessments/:id', async (req, res, next) => {
  try {
    const assessmentId = parseInt(req.params.id);
    
    console.log('PUT /assessments/:id - Received request:', {
      assessmentId,
      params: req.params,
      body: req.body
    });
    
    if (isNaN(assessmentId) || assessmentId <= 0) {
      console.error('Invalid assessment ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid assessment ID' });
    }

    const existing = await req.prisma.case_mh_assessment.findUnique({
      where: { assessment_id: assessmentId }
    });

    if (!existing) {
      console.error('Assessment not found:', assessmentId);
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Helper: normalize date strings to Date objects for Prisma
    const normalizeDate = (value) => {
      if (!value) return null;
      try {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const updatedAssessment = await req.prisma.case_mh_assessment.update({
      where: { assessment_id: assessmentId },
      data: {
        cac_id: req.body.cac_id ?? existing.cac_id,
        case_id: req.body.case_id ?? existing.case_id,
        agency_id: req.body.agency_id ?? existing.agency_id,
        mh_provider_agency_id: req.body.mh_provider_agency_id ?? existing.mh_provider_agency_id,
        assessment_instrument_id: req.body.assessment_instrument_id ?? existing.assessment_instrument_id,
        provider_employee_id: req.body.provider_employee_id ?? existing.provider_employee_id,
        timing_id: req.body.timing_id ?? existing.timing_id,
        session_date: req.body.session_date ? normalizeDate(req.body.session_date) : existing.session_date,
        assessment_date: req.body.assessment_date ? normalizeDate(req.body.assessment_date) : existing.assessment_date,
        comments: req.body.comments ?? existing.comments
      }
    });

    res.json(updatedAssessment);
  } catch (error) {
    console.error('Error updating assessment:', error);
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/assessments/:id
 * @desc Delete an existing assessment
 */
router.delete('/assessments/:id', async (req, res, next) => {
  try {
    const assessmentId = parseInt(req.params.id);
    
    console.log('DELETE /assessments/:id - Received request:', {
      assessmentId,
      params: req.params,
      method: req.method,
      url: req.url
    });
    
    if (isNaN(assessmentId) || assessmentId <= 0) {
      console.error('Invalid assessment ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid assessment ID' });
    }

    const existing = await req.prisma.case_mh_assessment.findUnique({
      where: { assessment_id: assessmentId }
    });

    if (!existing) {
      console.error('Assessment not found:', assessmentId);
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Delete the assessment
    await req.prisma.case_mh_assessment.delete({
      where: { assessment_id: assessmentId }
    });

    console.log('Assessment deleted successfully:', assessmentId);
    res.status(200).json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/assessment-scores
 * @desc Add scores for an assessment
 */
router.post('/assessment-scores', async (req, res, next) => {
  try {
    // Get maximum score ID
    const maxScoreIdResult = await req.prisma.case_mh_assessment_measure_scores.findFirst({
      orderBy: {
        score_id: 'desc'
      },
      select: {
        score_id: true
      }
    });
    
    const newScoreId = maxScoreIdResult ? maxScoreIdResult.score_id + 1 : 1;
    
    const newScores = await req.prisma.case_mh_assessment_measure_scores.create({
      data: {
        score_id: newScoreId,
        cac_id: req.body.cac_id,
        case_id: req.body.case_id,
        assessment_id: req.body.assessment_id,
        instrument_id: req.body.instrument_id,
        mh_assessment_scores: req.body.mh_assessment_scores
      }
    });
    
    res.status(201).json(newScores);
  } catch (error) {
    next(error);
  }
});

// ----- Diagnoses -----

/**
 * @route GET /api/mentalhealth/diagnoses/case/:caseId
 * @desc Get all diagnoses for a case
 */
router.get('/diagnoses/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    
    // Since case_mh_assessment_diagnosis is ignored by Prisma due to no primary key
    // Using raw query
    const diagnoses = await req.prisma.$queryRaw`
      SELECT 
        d.case_id, 
        d.mh_provider_agency_id, 
        d.diagnosis_date, 
        d.provider_employee_id,
        a.agency_name,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name
      FROM case_mh_assessment_diagnosis d
      LEFT JOIN cac_agency a ON d.mh_provider_agency_id = a.agency_id
      LEFT JOIN employee e ON d.provider_employee_id = e.employee_id
      WHERE d.case_id = ${caseId}
    `;
    
    res.json(diagnoses);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/diagnoses
 * @desc Create a new diagnosis
 */
router.post('/diagnoses', async (req, res, next) => {
  try {
    // Convert string date from frontend to JavaScript Date object
    // This ensures Prisma uses the correct DATE type when binding parameters in $executeRaw
    const diagnosisDate = req.body.diagnosis_date
      ? new Date(req.body.diagnosis_date)
      : null;

    // Using raw query since the table is ignored by Prisma
    const providerEmployeeId = req.body.provider_employee_id ? parseInt(req.body.provider_employee_id) : null;
    
    await req.prisma.$executeRaw`
      INSERT INTO case_mh_assessment_diagnosis (case_id, diagnosis_date, mh_provider_agency_id, provider_employee_id)
      VALUES (${req.body.case_id}, ${diagnosisDate}, ${req.body.mh_provider_agency_id}, ${providerEmployeeId})
    `;
    
    res.status(201).json({ message: 'Diagnosis created successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/mentalhealth/diagnoses
 * @desc Update an existing diagnosis
 */
router.put('/diagnoses', async (req, res, next) => {
  try {
    const { case_id, diagnosis_date, mh_provider_agency_id, provider_employee_id, old_case_id, old_diagnosis_date, old_mh_provider_agency_id } = req.body;
    
    if (!case_id || !diagnosis_date) {
      return res.status(400).json({ message: 'case_id and diagnosis_date are required' });
    }
    
    const newDiagnosisDate = new Date(diagnosis_date);
    const oldDiagnosisDate = old_diagnosis_date ? new Date(old_diagnosis_date) : null;
    const newAgencyId = mh_provider_agency_id ? parseInt(mh_provider_agency_id) : null;
    const oldAgencyId = old_mh_provider_agency_id ? parseInt(old_mh_provider_agency_id) : null;
    const newProviderEmployeeId = provider_employee_id ? parseInt(provider_employee_id) : null;
    
    if (isNaN(newDiagnosisDate.getTime())) {
      return res.status(400).json({ message: 'Invalid diagnosis_date format' });
    }
    
    // Since all fields are part of the composite key, we need to delete old and insert new
    if (old_case_id && old_diagnosis_date) {
      // Delete old record
      await req.prisma.$executeRaw`
        DELETE FROM case_mh_assessment_diagnosis
        WHERE case_id = ${parseInt(old_case_id)}
          AND diagnosis_date = ${oldDiagnosisDate}::date
          AND (mh_provider_agency_id = ${oldAgencyId} OR (mh_provider_agency_id IS NULL AND ${oldAgencyId} IS NULL))
      `;
    }
    
    // Insert new record
    await req.prisma.$executeRaw`
      INSERT INTO case_mh_assessment_diagnosis (case_id, diagnosis_date, mh_provider_agency_id, provider_employee_id)
      VALUES (${parseInt(case_id)}, ${newDiagnosisDate}::date, ${newAgencyId}, ${newProviderEmployeeId})
    `;
    
    res.json({ message: 'Diagnosis updated successfully' });
  } catch (error) {
    console.error('Error updating diagnosis:', error);
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/diagnoses
 * @desc Delete a diagnosis
 */
router.delete('/diagnoses', async (req, res, next) => {
  try {
    const { case_id, diagnosis_date, mh_provider_agency_id } = req.body;
    
    if (!case_id || !diagnosis_date) {
      return res.status(400).json({ message: 'case_id and diagnosis_date are required' });
    }
    
    const diagnosisDate = new Date(diagnosis_date);
    const agencyId = mh_provider_agency_id ? parseInt(mh_provider_agency_id) : null;
    
    if (isNaN(diagnosisDate.getTime())) {
      return res.status(400).json({ message: 'Invalid diagnosis_date format' });
    }
    
    // Using raw query since the table is ignored by Prisma
    const result = await req.prisma.$executeRaw`
      DELETE FROM case_mh_assessment_diagnosis
      WHERE case_id = ${parseInt(case_id)}
        AND diagnosis_date = ${diagnosisDate}::date
        AND (mh_provider_agency_id = ${agencyId} OR (mh_provider_agency_id IS NULL AND ${agencyId} IS NULL))
    `;
    
    res.status(200).json({ message: 'Diagnosis deleted successfully' });
  } catch (error) {
    console.error('Error deleting diagnosis:', error);
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/diagnoses/:caseId/:date/:agencyId
 * @desc Get a specific diagnosis by composite key
 */
router.get('/diagnoses/:caseId/:date/:agencyId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    const diagnosisDate = new Date(req.params.date);
    const agencyId = req.params.agencyId === 'null' || req.params.agencyId === 'undefined' 
      ? null 
      : parseInt(req.params.agencyId);
    
    if (isNaN(caseId) || isNaN(diagnosisDate.getTime())) {
      return res.status(400).json({ message: 'Invalid case ID or diagnosis date' });
    }
    
    // Using raw query since the table is ignored by Prisma
    const diagnosis = await req.prisma.$queryRaw`
      SELECT 
        d.case_id, 
        d.diagnosis_date, 
        d.mh_provider_agency_id, 
        d.provider_employee_id,
        a.agency_name,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name
      FROM case_mh_assessment_diagnosis d
      LEFT JOIN cac_agency a ON d.mh_provider_agency_id = a.agency_id
      LEFT JOIN employee e ON d.provider_employee_id = e.employee_id
      WHERE d.case_id = ${caseId}
        AND d.diagnosis_date = ${diagnosisDate}::date
        AND (d.mh_provider_agency_id = ${agencyId} OR (d.mh_provider_agency_id IS NULL AND ${agencyId} IS NULL))
      LIMIT 1
    `;
    
    if (!diagnosis || diagnosis.length === 0) {
      return res.status(404).json({ message: 'Diagnosis not found' });
    }
    
    res.json(diagnosis[0]);
  } catch (error) {
    next(error);
  }
});

// ----- Treatment Models -----

/**
 * @route GET /api/mentalhealth/treatment-models
 * @desc Get all treatment models
 */
router.get('/treatment-models', async (req, res, next) => {
  try {
    const models = await req.prisma.case_mh_treatment_models.findMany({
      orderBy: {
        model_name: 'asc'
      }
    });
    res.json(models);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/treatment-models/:id
 * @desc Get a treatment model by ID
 */
router.get('/treatment-models/:id', async (req, res, next) => {
  try {
    const modelId = parseInt(req.params.id);
    const model = await req.prisma.case_mh_treatment_models.findUnique({
      where: { id: modelId }
    });
    
    if (!model) {
      return res.status(404).json({ message: 'Treatment model not found' });
    }
    
    res.json(model);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/treatment-models
 * @desc Create a new treatment model
 */
router.post('/treatment-models', async (req, res, next) => {
  try {
    const { id, model_name } = req.body;
    
    // Validate required fields
    if (!model_name) {
      return res.status(400).json({ message: 'Model name is required' });
    }
    
    // Check if ID is provided, otherwise get the next available ID
    let modelId = id;
    if (!modelId) {
      const maxIdResult = await req.prisma.case_mh_treatment_models.findFirst({
        orderBy: {
          id: 'desc'
        },
        select: {
          id: true
        }
      });
      
      modelId = maxIdResult ? maxIdResult.id + 1 : 1;
    }
    
    // Create the treatment model
    const newModel = await req.prisma.case_mh_treatment_models.create({
      data: {
        id: modelId,
        model_name: model_name
      }
    });
    
    res.status(201).json(newModel);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/mentalhealth/treatment-models/:id
 * @desc Update a treatment model
 */
router.put('/treatment-models/:id', async (req, res, next) => {
  try {
    const modelId = parseInt(req.params.id);
    const { model_name } = req.body;
    
    // Validate required fields
    if (!model_name) {
      return res.status(400).json({ message: 'Model name is required' });
    }
    
    // Update the treatment model
    const updatedModel = await req.prisma.case_mh_treatment_models.update({
      where: { id: modelId },
      data: {
        model_name: model_name
      }
    });
    
    res.json(updatedModel);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/treatment-models/:id
 * @desc Delete a treatment model
 */
router.delete('/treatment-models/:id', async (req, res, next) => {
  try {
    const modelId = parseInt(req.params.id);
    
    // Check if the model is in use in any treatment plans
    const plansUsingModel = await req.prisma.case_mh_treatment_plans.findMany({
      where: { treatment_model_id: modelId },
      take: 1
    });
    
    if (plansUsingModel.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete treatment model: it is in use by existing treatment plans'
      });
    }
    
    // Delete the treatment model
    await req.prisma.case_mh_treatment_models.delete({
      where: { id: modelId }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ----- Treatment Plans -----

/**
 * @route GET /api/mentalhealth/treatment-plans/case/:caseId
 * @desc Get all treatment plans for a case
 */
router.get('/treatment-plans/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    
    // Validate caseId
    if (isNaN(caseId) || caseId <= 0) {
      return res.status(400).json({ 
        message: 'Invalid case ID',
        error: 'Case ID must be a positive integer'
      });
    }
    
    // Check if case exists
    const caseExists = await req.prisma.cac_case.findUnique({
      where: { case_id: caseId }
    });
    
    if (!caseExists) {
      return res.status(404).json({ 
        message: 'Case not found',
        error: `Case with ID ${caseId} does not exist`
      });
    }
    
    // Fetch treatment plans
    const plans = await req.prisma.case_mh_treatment_plans.findMany({
      where: { case_id: caseId },
      include: {
        case_mh_treatment_models: true,
        cac_agency: true,
        employee: true
      },
      orderBy: {
        treatment_plan_date: 'desc'
      }
    });
    
    // Return empty array if no plans found (this is not an error)
    res.json(plans || []);
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/treatment-plans/:id
 * @desc Get a treatment plan by ID
 */
router.get('/treatment-plans/:id', async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await req.prisma.case_mh_treatment_plans.findUnique({
      where: { id: planId },
      include: {
        case_mh_treatment_models: true,
        cac_agency: true,
        employee: true
      }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/treatment-plans
 * @desc Create a new treatment plan
 */
router.post('/treatment-plans', async (req, res, next) => {
  try {
    // Get maximum plan ID
    const maxPlanIdResult = await req.prisma.case_mh_treatment_plans.findFirst({
      orderBy: {
        id: 'desc'
      },
      select: {
        id: true
      }
    });
    
    const newPlanId = maxPlanIdResult ? maxPlanIdResult.id + 1 : 1;
    
    // Ensure integer fields are actually integers
    const treatmentModelId = req.body.treatment_model_id ? parseInt(req.body.treatment_model_id) : null;
    const providerAgencyId = req.body.provider_agency_id ? parseInt(req.body.provider_agency_id) : null;
    const cacId = parseInt(req.body.cac_id);
    const caseId = parseInt(req.body.case_id);
    const authorizedStatusId = req.body.authorized_status_id ? parseInt(req.body.authorized_status_id) : null;
    const duration = req.body.duration ? parseInt(req.body.duration) : null;
    const providerEmployeeId = req.body.provider_employee_id ? parseInt(req.body.provider_employee_id) : null;
    
    // Format date fields properly - convert strings to Date objects
    // This ensures proper ISO-8601 format that Prisma expects
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === "null" || (typeof dateStr === "string" && dateStr.trim() === "")) return null;
      try {
        // Create a date object which will be serialized as a proper ISO string when sent to Prisma
        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn("Invalid date string:", dateStr);
          return null;
        }
        return date;
      } catch (error) {
        console.error("Error parsing date:", dateStr, error);
        return null;
      }
    };

    const treatmentPlanDate = formatDate(req.body.treatment_plan_date);
    const plannedStartDate = formatDate(req.body.planned_start_date);
    const plannedEndDate = formatDate(req.body.planned_end_date);
    const plannedReviewDate = formatDate(req.body.planned_review_date);
    
    // Debug: Log the incoming data
    console.log('Creating treatment plan with data:', {
      privacy_forms: req.body.privacy_forms,
      consents: req.body.consents,
      session_notes: req.body.session_notes,
      goals_progress: req.body.goals_progress
    });
    
    const newPlan = await req.prisma.case_mh_treatment_plans.create({
      data: {
        id: newPlanId,
        treatment_model_id: treatmentModelId,
        provider_agency_id: providerAgencyId,
        cac_id: cacId,
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate,
        case_id: caseId,
        authorized_status_id: authorizedStatusId,
        duration: duration,
        duration_unit: req.body.duration_unit || null,
        planned_review_date: plannedReviewDate,
        treatment_plan_date: treatmentPlanDate,
        provider_employee_id: providerEmployeeId,
        session_notes: req.body.session_notes || null,
        goals_progress: req.body.goals_progress || null,
        privacy_forms: req.body.privacy_forms || null,
        consents: req.body.consents || null
      }
    });
    
    res.status(201).json(newPlan);
  } catch (error) {
    console.error("Error creating treatment plan:", error);
    next(error);
  }
});

/**
 * @route PUT /api/mentalhealth/treatment-plans/:id
 * @desc Update an existing treatment plan
 */
router.put('/treatment-plans/:id', async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id);
    
    // Verify the plan exists
    const existingPlan = await req.prisma.case_mh_treatment_plans.findUnique({
      where: { id: planId }
    });
    
    if (!existingPlan) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }
    
    // Ensure integer fields are actually integers
    const treatmentModelId = req.body.treatment_model_id ? parseInt(req.body.treatment_model_id) : null;
    const providerAgencyId = req.body.provider_agency_id ? parseInt(req.body.provider_agency_id) : null;
    const authorizedStatusId = req.body.authorized_status_id ? parseInt(req.body.authorized_status_id) : null;
    const duration = req.body.duration ? parseInt(req.body.duration) : null;
    const providerEmployeeId = req.body.provider_employee_id ? parseInt(req.body.provider_employee_id) : null;
    
    // Format date fields properly - convert strings to Date objects
    // This ensures proper ISO-8601 format that Prisma expects
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === "null" || (typeof dateStr === "string" && dateStr.trim() === "")) return null;
      try {
        // Create a date object which will be serialized as a proper ISO string when sent to Prisma
        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn("Invalid date string:", dateStr);
          return null;
        }
        return date;
      } catch (error) {
        console.error("Error parsing date:", dateStr, error);
        return null;
      }
    };

    const treatmentPlanDate = formatDate(req.body.treatment_plan_date);
    const plannedStartDate = formatDate(req.body.planned_start_date);
    const plannedEndDate = formatDate(req.body.planned_end_date);
    const plannedReviewDate = formatDate(req.body.planned_review_date);
    
    // Debug: Log the incoming data
    console.log('Updating treatment plan with data:', {
      privacy_forms: req.body.privacy_forms,
      consents: req.body.consents,
      session_notes: req.body.session_notes,
      goals_progress: req.body.goals_progress
    });
    
    // Update the treatment plan
    const updatedPlan = await req.prisma.case_mh_treatment_plans.update({
      where: { id: planId },
      data: {
        treatment_model_id: treatmentModelId,
        provider_agency_id: providerAgencyId,
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate,
        authorized_status_id: authorizedStatusId,
        duration: duration,
        duration_unit: req.body.duration_unit || null,
        planned_review_date: plannedReviewDate,
        treatment_plan_date: treatmentPlanDate,
        provider_employee_id: providerEmployeeId,
        session_notes: req.body.session_notes !== undefined ? req.body.session_notes : undefined,
        goals_progress: req.body.goals_progress !== undefined ? req.body.goals_progress : undefined,
        privacy_forms: req.body.privacy_forms !== undefined ? req.body.privacy_forms : undefined,
        consents: req.body.consents !== undefined ? req.body.consents : undefined
      }
    });
    
    res.json(updatedPlan);
  } catch (error) {
    console.error("Error updating treatment plan:", error);
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/treatment-plans/:id
 * @desc Delete a treatment plan
 */
router.delete('/treatment-plans/:id', async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id);
    
    await req.prisma.case_mh_treatment_plans.delete({
      where: { id: planId }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ----- Provider Log -----

/**
 * @route GET /api/mentalhealth/providers/case/:caseId
 * @desc Get all providers for a case
 */
router.get('/providers/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    const providers = await req.prisma.case_mh_provider.findMany({
      where: { case_id: caseId },
      include: {
        cac_agency: true,
        employee: true
      }
    });
    
    // Format the response similar to the SQL query
    const formattedProviders = providers.map(provider => {
      return {
        id: provider.id,
        therapy_offered_date: provider.therapy_offered_date,
        agency_name: provider.cac_agency?.agency_name,
        therapist: provider.employee ? `${provider.employee.first_name || ''} ${provider.employee.last_name || ''}`.trim() : null,
        case_number: provider.case_number
      };
    });
    
    res.json(formattedProviders);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/providers
 * @desc Add a provider to a case
 */
router.post('/providers', async (req, res, next) => {
  try {
    // Get maximum provider ID
    const maxProviderIdResult = await req.prisma.case_mh_provider.findFirst({
      orderBy: {
        id: 'desc'
      },
      select: {
        id: true
      }
    });
    
    const newProviderId = maxProviderIdResult ? maxProviderIdResult.id + 1 : 1;
    
    const newProvider = await req.prisma.case_mh_provider.create({
      data: {
        id: newProviderId,
        agency_id: req.body.agency_id,
        case_id: req.body.case_id,
        case_number: req.body.case_number,
        lead_employee_id: req.body.lead_employee_id,
        provider_type_id: req.body.provider_type_id,
        therapy_accepted: req.body.therapy_accepted,
        therapy_complete_date: req.body.therapy_complete_date,
        therapy_end_reason_id: req.body.therapy_end_reason_id,
        therapy_offered_date: req.body.therapy_offered_date,
        therapy_record_created: req.body.therapy_record_created
      }
    });
    
    res.status(201).json(newProvider);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/providers/:id
 * @desc Delete a provider from a case
 */
router.delete('/providers/:id', async (req, res, next) => {
  try {
    const providerId = parseInt(req.params.id);
    
    await req.prisma.case_mh_provider.delete({
      where: { id: providerId }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ----- Sessions -----

/**
 * @route GET /api/mentalhealth/sessions/case/:caseId
 * @desc Get all sessions for a case
 */
router.get('/sessions/case/:caseId', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    const sessions = await req.prisma.case_mh_session_log_enc.findMany({
      where: { case_id: caseId },
      include: {
        cac_agency: true,
        employee: true,
        case_mh_session_attendee: {
          include: {
            person: true
          }
        }
      },
      orderBy: {
        session_date: 'desc'
      }
    });
    
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/sessions
 * @desc Create a new session
 */
router.post('/sessions', async (req, res, next) => {
  try {
    // ---- Basic validation & normalization ----
    const rawCacId = req.body.cac_id;
    const rawCaseId = req.body.case_id;
    const rawStatusId = req.body.session_status_id;
    const rawSessionDate = req.body.session_date;

    // 1. Parse case_id first (required), as we may need to look up cac_id from it later
    const caseId = rawCaseId !== undefined && rawCaseId !== null && rawCaseId !== ''
      ? parseInt(rawCaseId)
      : NaN;
    if (Number.isNaN(caseId)) {
      return res.status(400).json({
        message: 'Missing or invalid "case_id" when creating mental health session'
      });
    }

    // 2. Parse session_status_id (required, must be an Int foreign key)
    const statusId = rawStatusId !== undefined && rawStatusId !== null && rawStatusId !== ''
      ? parseInt(rawStatusId)
      : NaN;

    if (Number.isNaN(statusId)) {
      return res.status(400).json({
        message: 'Missing or invalid "session_status_id" when creating mental health session (must be a numeric status_id)'
      });
    }

    // 3. cac_id can come from frontend, or be looked up from case_id (like assessment / treatment plan, "knowing which CAC the current case belongs to")
    let cacId = rawCacId !== undefined && rawCacId !== null && rawCacId !== ''
      ? parseInt(rawCacId)
      : NaN;

    if (Number.isNaN(cacId)) {
      // If frontend didn't provide or provided invalid value, look up cac_id from cac_case table using case_id
      const caseRecord = await req.prisma.cac_case.findUnique({
        where: { case_id: caseId },
        select: { cac_id: true }
      });

      if (!caseRecord || caseRecord.cac_id === null || caseRecord.cac_id === undefined) {
        return res.status(400).json({
          message: 'Unable to resolve "cac_id" from case. Please verify the case has a CAC assigned.'
        });
      }

      cacId = caseRecord.cac_id;
    }

    // 3. Parse and validate session_date (required), convert to full ISO-8601 string to avoid Prisma errors
    if (!rawSessionDate) {
      return res.status(400).json({
        message: 'Missing "session_date" when creating mental health session'
      });
    }

    let sessionDateIso;
    try {
      // Allow "yyyy-MM-dd" or ISO string with time, extract date part uniformly
      const datePart = String(rawSessionDate).split('T')[0];
      const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) {
        throw new Error('Invalid date');
      }
      // Construct unambiguous ISO-8601 string (UTC 00:00:00)
      sessionDateIso = `${datePart}T00:00:00.000Z`;
    } catch {
      return res.status(400).json({
        message: 'Invalid "session_date" format when creating mental health session. Expected format like "2025-12-03".'
      });
    }

    // At this point, caseId / cacId / statusId / sessionDateIso are all valid values

    // Get maximum session ID
    const maxSessionIdResult = await req.prisma.case_mh_session_log_enc.findFirst({
      orderBy: {
        case_mh_session_id: 'desc'
      },
      select: {
        case_mh_session_id: true
      }
    });
    
    const newSessionId = maxSessionIdResult ? maxSessionIdResult.case_mh_session_id + 1 : 1;
    
    const newSession = await req.prisma.case_mh_session_log_enc.create({
      data: {
        case_mh_session_id: newSessionId,
        // Required relations / FKs
        cac_id: cacId,
        case_id: caseId,
        session_status_id: statusId,
        // Optional scalar fields (normalized where appropriate)
        comments: req.body.comments,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        intervention_id: req.body.intervention_id ? parseInt(req.body.intervention_id) : null,
        location_id: req.body.location_id ? parseInt(req.body.location_id) : null,
        onsite: req.body.onsite,
        provider_agency_id: req.body.provider_agency_id ? parseInt(req.body.provider_agency_id) : null,
        provider_employee_id: req.body.provider_employee_id ? parseInt(req.body.provider_employee_id) : null,
        session_date: sessionDateIso,
        session_type_id: req.body.session_type_id ? parseInt(req.body.session_type_id) : null,
        recurring: req.body.recurring,
        recurring_fre: req.body.recurring_fre,
        recurring_duration: req.body.recurring_duration
          ? parseInt(req.body.recurring_duration)
          : null,
        recurring_duration_unit: req.body.recurring_duration_unit
      }
    });
    
    res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/sessions/:sessionId/attendees
 * @desc Add an attendee to a session
 */
router.post('/sessions/:sessionId/attendees', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    // Get maximum attendee ID
    const maxAttendeeIdResult = await req.prisma.case_mh_session_attendee.findFirst({
      orderBy: {
        case_mh_session_attendee_id: 'desc'
      },
      select: {
        case_mh_session_attendee_id: true
      }
    });
    
    const newAttendeeId = maxAttendeeIdResult ? maxAttendeeIdResult.case_mh_session_attendee_id + 1 : 1;
    
    const newAttendee = await req.prisma.case_mh_session_attendee.create({
      data: {
        case_mh_session_attendee_id: newAttendeeId,
        person_id: req.body.person_id,
        cac_id: req.body.cac_id,
        case_id: req.body.case_id,
        case_mh_session_id: sessionId
      }
    });
    
    res.status(201).json(newAttendee);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/mentalhealth/sessions/:sessionId/attendees
 * @desc Get all attendees for a session
 */
router.get('/sessions/:sessionId/attendees', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const attendees = await req.prisma.case_mh_session_attendee.findMany({
      where: { case_mh_session_id: sessionId },
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
 * @route GET /api/mentalhealth/sessions/:sessionId/attributes
 * @desc Get all attribute groups for a session
 */
router.get('/sessions/:sessionId/attributes', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const attributes = await req.prisma.case_mh_session_attribute_group.findMany({
      where: { case_mh_session_id: sessionId }
    });
    
    res.json(attributes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/mentalhealth/sessions/:sessionId/attributes
 * @desc Add an attribute group to a session
 */
router.post('/sessions/:sessionId/attributes', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    // Get maximum attribute group ID
    const maxAttributeIdResult = await req.prisma.case_mh_session_attribute_group.findFirst({
      orderBy: {
        id: 'desc'
      },
      select: {
        id: true
      }
    });
    
    const newAttributeId = maxAttributeIdResult ? maxAttributeIdResult.id + 1 : 1;
    
    const newAttribute = await req.prisma.case_mh_session_attribute_group.create({
      data: {
        id: newAttributeId,
        cac_id: req.body.cac_id,
        case_id: req.body.case_id,
        case_mh_session_id: sessionId,
        attribute_group_description: req.body.attribute_group_description,
        attributes: req.body.attributes,
        attribute_value: req.body.attribute_value
      }
    });
    
    res.status(201).json(newAttribute);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/mentalhealth/sessions/:id
 * @desc Update a session
 */
router.put('/sessions/:id', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (Number.isNaN(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Invalid session id' });
    }

    // Normalize and validate session_date if it is provided
    let sessionDateData = {};
    if (req.body.session_date !== undefined) {
      const rawSessionDate = req.body.session_date;

      if (rawSessionDate === null || rawSessionDate === '') {
        // Do not allow setting required session_date to null; frontend should validate before clearing
        return res.status(400).json({
          message: 'Missing or invalid "session_date" when updating mental health session'
        });
      }

      try {
        const datePart = String(rawSessionDate).split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
          throw new Error('Invalid date');
        }
        const iso = `${datePart}T00:00:00.000Z`;
        sessionDateData.session_date = iso;
      } catch {
        return res.status(400).json({
          message: 'Invalid "session_date" format when updating mental health session. Expected format like "2025-12-03".'
        });
      }
    }

    // Normalize and validate session_status_id if it is provided
    let statusIdData = {};
    if (req.body.session_status_id !== undefined) {
      const rawStatusId = req.body.session_status_id;
      const statusId = rawStatusId !== null && rawStatusId !== ''
        ? parseInt(rawStatusId)
        : NaN;

      if (Number.isNaN(statusId)) {
        return res.status(400).json({
          message: 'Invalid "session_status_id" when updating mental health session (must be a numeric status_id)'
        });
      }

      statusIdData.session_status_id = statusId;
    }

    const updatedSession = await req.prisma.case_mh_session_log_enc.update({
      where: { case_mh_session_id: sessionId },
      data: {
        comments: req.body.comments,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        intervention_id: req.body.intervention_id ? parseInt(req.body.intervention_id) : null,
        location_id: req.body.location_id ? parseInt(req.body.location_id) : null,
        onsite: req.body.onsite,
        provider_agency_id: req.body.provider_agency_id ? parseInt(req.body.provider_agency_id) : null,
        provider_employee_id: req.body.provider_employee_id ? parseInt(req.body.provider_employee_id) : null,
        session_type_id: req.body.session_type_id ? parseInt(req.body.session_type_id) : null,
        recurring: req.body.recurring,
        recurring_fre: req.body.recurring_fre,
        recurring_duration: req.body.recurring_duration
          ? parseInt(req.body.recurring_duration)
          : null,
        recurring_duration_unit: req.body.recurring_duration_unit,
        ...statusIdData,
        ...sessionDateData
      }
    });
    
    res.json(updatedSession);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/mentalhealth/sessions/:id
 * @desc Delete a session
 */
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    // Due to foreign key constraints, we need to delete related records first
    await req.prisma.case_mh_session_attribute_group.deleteMany({
      where: { case_mh_session_id: sessionId }
    });
    
    await req.prisma.case_mh_session_attendee.deleteMany({
      where: { case_mh_session_id: sessionId }
    });
    
    await req.prisma.case_mh_session_log_enc.delete({
      where: { case_mh_session_id: sessionId }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;