// src/api/routes/employees.js
import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/employees
 * @desc Get all employees
 */
router.get('/', async (req, res, next) => {
  try {
    const employees = await req.prisma.employee.findMany({
      orderBy: {
        last_name: 'asc'
      },
      select: {
        employee_id: true,
        first_name: true,
        last_name: true,
        agency_id: true, // Include agency_id so frontend can use it
        cac_id: true,
        email_addr: true,
        job_title: true,
        phone_number: true
      }
    });
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/:id
 * @desc Get an employee by id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.id);
    const employee = await req.prisma.employee.findUnique({
      where: { employee_id: employeeId }
    });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/agency/:agencyId
 * @desc Get all employees for an agency
 */
router.get('/agency/:agencyId', async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.agencyId);
    const employees = await req.prisma.employee.findMany({
      where: { agency_id: agencyId },
      orderBy: {
        last_name: 'asc'
      }
    });
    
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/cac/:cacId
 * @desc Get all employees for a CAC
 */
router.get('/cac/:cacId', async (req, res, next) => {
  try {
    const cacId = parseInt(req.params.cacId);
    const employees = await req.prisma.employee.findMany({
      where: { cac_id: cacId },
      orderBy: {
        last_name: 'asc'
      }
    });
    
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/employees
 * @desc Create a new employee
 */
router.post('/', async (req, res, next) => {
  try {
    // Get maximum employee ID
    const maxEmployeeIdResult = await req.prisma.employee.findFirst({
      orderBy: {
        employee_id: 'desc'
      },
      select: {
        employee_id: true
      }
    });
    
    const newEmployeeId = maxEmployeeIdResult ? maxEmployeeIdResult.employee_id + 1 : 1;
    
    const newEmployee = await req.prisma.employee.create({
      data: {
        employee_id: newEmployeeId,
        agency_id: req.body.agency_id,
        cac_id: req.body.cac_id,
        email_addr: req.body.email_addr,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        job_title: req.body.job_title,
        phone_number: req.body.phone_number
      }
    });
    
    res.status(201).json(newEmployee);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/employees/:id
 * @desc Update an employee
 */
router.put('/:id', async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.id);
    
    const updatedEmployee = await req.prisma.employee.update({
      where: { employee_id: employeeId },
      data: {
        agency_id: req.body.agency_id,
        email_addr: req.body.email_addr,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        job_title: req.body.job_title,
        phone_number: req.body.phone_number
      }
    });
    
    res.json(updatedEmployee);
  } catch (error) {
    next(error);
  }
});

export default router;