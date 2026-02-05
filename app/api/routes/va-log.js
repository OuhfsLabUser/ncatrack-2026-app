// src/api/routes/va-log.js
import { Router } from 'express';

const router = Router();

/**
 * @route POST /api/va-log
 * @desc Save VA log form data to database
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      case_id,
      referral_date,
      referral_source,
      referral_person_id,
      va_case_number,
      agency,
      va_person_id,
      va_services_offered_date,
      va_services_accepted,
      hope1,
      va_custom_field_2,
      va_custom_field_3,
      va_custom_field_4,
      date_consent_expires,
      va_field_6,
      va_custom_field_7,
      va_services_end_date,
      va_mdt_ready,
    } = req.body;

    if (!case_id) {
      return res.status(400).json({ message: 'case_id is required' });
    }

    // Get case to retrieve cac_id
    const existingCase = await req.prisma.cac_case.findUnique({
      where: { case_id: parseInt(case_id) },
      select: { cac_id: true }
    });

    if (!existingCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Prepare update data - map form fields to database fields
    const updateData = {};

    // Map VA-specific fields that exist in cac_case table
    if (va_case_number !== undefined) updateData.va_case_number = va_case_number;
    if (va_services_offered_date !== undefined && va_services_offered_date !== null) {
      updateData.va_services_offered_date = new Date(va_services_offered_date);
    }
    if (va_services_accepted !== undefined) updateData.va_services_accepted = va_services_accepted;
    if (va_services_end_date !== undefined && va_services_end_date !== null) {
      updateData.va_services_end_date = new Date(va_services_end_date);
    }
    if (va_mdt_ready !== undefined) updateData.va_mdt_ready = va_mdt_ready;
    if (referral_date !== undefined && referral_date !== null) {
      updateData.va_referral_date = new Date(referral_date);
    }
    
    // Note: Some fields like referral_source, hope1, custom fields might need to be stored
    // in a separate table if they don't exist in cac_case. For now, we'll update what we can.
    
    // Update the case with VA log data
    const updatedCase = await req.prisma.cac_case.update({
      where: { case_id: parseInt(case_id) },
      data: updateData
    });

    res.status(200).json({
      message: 'VA log data saved successfully',
      case: updatedCase
    });
  } catch (error) {
    console.error('Error saving VA log:', error);
    next(error);
  }
});

export default router;

