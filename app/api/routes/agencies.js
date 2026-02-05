// src/api/routes/agencies.js
import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/agencies
 * @desc Get all agencies
 */
router.get('/', async (req, res, next) => {
  try {
    const agencies = await req.prisma.cac_agency.findMany({
      orderBy: {
        agency_name: 'asc'
      }
    });
    res.json(agencies);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/agencies/:id
 * @desc Get an agency by id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);
    const agency = await req.prisma.cac_agency.findUnique({
      where: { agency_id: agencyId }
    });
    
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/agencies/name/:name
 * @desc Get an agency by name
 */
router.get('/name/:name', async (req, res, next) => {
  try {
    const agencyName = req.params.name;
    const agency = await req.prisma.cac_agency.findFirst({
      where: { 
        agency_name: {
          equals: agencyName,
          mode: 'insensitive'
        }
      }
    });
    
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/agencies/cac/:cacId
 * @desc Get all agencies for a CAC
 */
router.get('/cac/:cacId', async (req, res, next) => {
  try {
    const cacId = parseInt(req.params.cacId);
    const agencies = await req.prisma.cac_agency.findMany({
      where: { cac_id: cacId },
      orderBy: {
        agency_name: 'asc'
      }
    });
    
    res.json(agencies);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/agencies
 * @desc Create a new agency
 */
router.post('/', async (req, res, next) => {
  try {
    // Get maximum agency ID
    const maxAgencyIdResult = await req.prisma.cac_agency.findFirst({
      orderBy: {
        agency_id: 'desc'
      },
      select: {
        agency_id: true
      }
    });
    
    const newAgencyId = maxAgencyIdResult ? maxAgencyIdResult.agency_id + 1 : 1;
    
    const newAgency = await req.prisma.cac_agency.create({
      data: {
        agency_id: newAgencyId,
        cac_id: req.body.cac_id,
        agency_name: req.body.agency_name,
        addr_line_1: req.body.addr_line_1,
        addr_line_2: req.body.addr_line_2,
        city: req.body.city,
        state_abbr: req.body.state_abbr,
        phone_number: req.body.phone_number,
        zip_code: req.body.zip_code
      }
    });
    
    res.status(201).json(newAgency);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/agencies/:id
 * @desc Update an agency
 */
router.put('/:id', async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);
    
    const updatedAgency = await req.prisma.cac_agency.update({
      where: { agency_id: agencyId },
      data: {
        agency_name: req.body.agency_name,
        addr_line_1: req.body.addr_line_1,
        addr_line_2: req.body.addr_line_2,
        city: req.body.city,
        state_abbr: req.body.state_abbr,
        phone_number: req.body.phone_number,
        zip_code: req.body.zip_code
      }
    });
    
    res.json(updatedAgency);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/agencies/states
 * @desc Get all states
 */
router.get('/states/all', async (req, res, next) => {
  try {
    // Since state_table is ignored by Prisma (no primary key)
    // Use raw query to get states
    const states = await req.prisma.$queryRaw`SELECT * FROM state_table`;
    res.json(states);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/agencies/cacs
 * @desc Get all CACs
 */
router.get('/cacs/all', async (req, res, next) => {
  try {
    const cacs = await req.prisma.child_advocacy_center.findMany({
      orderBy: {
        cac_name: 'asc'
      }
    });
    
    res.json(cacs);
  } catch (error) {
    next(error);
  }
});

export default router;