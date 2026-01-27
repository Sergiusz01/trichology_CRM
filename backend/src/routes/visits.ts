import express from 'express';
import { VisitStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { writeAuditLog } from '../services/auditService';

const router = express.Router();

const visitStatusValues = ['ZAPLANOWANA', 'ODBYTA', 'NIEOBECNOSC', 'ANULOWANA'] as const;

const visitSchema = z.object({
  patientId: z.string().min(1, 'ID pacjenta jest wymagane'),
  data: z.string().min(1, 'Data jest wymagana'),
  rodzajZabiegu: z.string().min(1, 'Rodzaj zabiegu jest wymagany'),
  notatki: z.string().optional().nullable(),
  status: z.enum(visitStatusValues).optional().default('ZAPLANOWANA'),
  numerWSerii: z.number().int().positive().optional().nullable(),
  liczbaSerii: z.number().int().positive().optional().nullable(),
  cena: z.number().nonnegative().optional().nullable(),
});

const updateVisitSchema = z.object({
  data: z.string().optional(),
  rodzajZabiegu: z.string().min(1).optional(),
  notatki: z.string().optional().nullable(),
  status: z.enum(visitStatusValues).optional(),
  numerWSerii: z.number().int().positive().optional().nullable(),
  liczbaSerii: z.number().int().positive().optional().nullable(),
  cena: z.number().nonnegative().optional().nullable(),
});

// Get all visits for a specific patient
router.get('/patient/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visits = await prisma.visit.findMany({
      where: { patientId: id },
      orderBy: { data: 'desc' },
    });

    res.json({ visits });
  } catch (error) {
    next(error);
  }
});

// Get upcoming visits (for dashboard) - next 6 visits from today with status ZAPLANOWANA
router.get('/upcoming', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visits = await prisma.visit.findMany({
      where: {
        data: {
          gte: today,
        },
        status: 'ZAPLANOWANA',
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { data: 'asc' },
      take: 6,
    });

    res.json({ visits });
  } catch (error) {
    next(error);
  }
});

// Get weekly revenue statistics
router.get('/stats/weekly-revenue', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    // Planned revenue (ZAPLANOWANA visits this week)
    const plannedVisits = await prisma.visit.findMany({
      where: {
        data: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        status: 'ZAPLANOWANA',
        cena: { not: null },
      },
      select: { cena: true },
    });

    // Completed revenue (ODBYTA visits this week)
    const completedVisits = await prisma.visit.findMany({
      where: {
        data: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        status: 'ODBYTA',
        cena: { not: null },
      },
      select: { cena: true },
    });

    // Count visits by status this week
    const visitsByStatus = await prisma.visit.groupBy({
      by: ['status'],
      where: {
        data: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      _count: { id: true },
    });

    const plannedRevenue = plannedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);
    const completedRevenue = completedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);

    const statusCounts: Record<string, number> = {};
    visitsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    res.json({
      plannedRevenue,
      completedRevenue,
      totalExpectedRevenue: plannedRevenue + completedRevenue,
      visitsThisWeek: {
        zaplanowana: statusCounts['ZAPLANOWANA'] || 0,
        odbyta: statusCounts['ODBYTA'] || 0,
        nieobecnosc: statusCounts['NIEOBECNOSC'] || 0,
        anulowana: statusCounts['ANULOWANA'] || 0,
      },
      weekRange: {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get visit by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    res.json({ visit });
  } catch (error) {
    next(error);
  }
});

// Create new visit (all authenticated users can create visits)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = visitSchema.parse(req.body);

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    // Parse the date - the frontend sends a local datetime string
    const visitDate = new Date(data.data);
    const now = new Date();
    now.setSeconds(0, 0); // Remove seconds and milliseconds for comparison

    // Validate: Planned visits cannot be in the past
    const status = (data.status || 'ZAPLANOWANA') as VisitStatus;
    if (status === 'ZAPLANOWANA' && visitDate < now) {
      return res.status(400).json({
        error: 'Błąd walidacji',
        message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
      });
    }

    const visit = await prisma.visit.create({
      data: {
        patientId: data.patientId,
        data: visitDate,
        rodzajZabiegu: data.rodzajZabiegu,
        notatki: data.notatki,
        status: data.status as VisitStatus,
        numerWSerii: data.numerWSerii,
        liczbaSerii: data.liczbaSerii,
        cena: data.cena,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ visit });

    // Audit log
    await writeAuditLog(req, {
      action: 'CREATE_VISIT',
      entity: 'Visit',
      entityId: visit.id,
    });
  } catch (error) {
    next(error);
  }
});

// Update visit (DOCTOR/ADMIN only - ASSISTANT can only create)
router.put('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateVisitSchema.parse(req.body);

    // Get existing visit
    const existingVisit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    // Parse date if provided
    const updateData: any = {};
    if (data.data) {
      const visitDate = new Date(data.data);
      const now = new Date();
      now.setSeconds(0, 0); // Remove seconds and milliseconds for comparison

      // Validate: Planned visits cannot be in the past
      const newStatus = (data.status || existingVisit.status) as VisitStatus;
      if (newStatus === 'ZAPLANOWANA' && visitDate < now) {
        return res.status(400).json({
          error: 'Błąd walidacji',
          message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
        });
      }

      updateData.data = visitDate;
    }
    if (data.rodzajZabiegu) updateData.rodzajZabiegu = data.rodzajZabiegu;
    if (data.notatki !== undefined) updateData.notatki = data.notatki;
    if (data.status) {
      // Validate status change: if changing to ZAPLANOWANA, check date
      if (data.status === 'ZAPLANOWANA') {
        const visitDate = updateData.data ? new Date(updateData.data) : existingVisit.data;
        const now = new Date();
        now.setSeconds(0, 0);
        if (visitDate < now) {
          return res.status(400).json({
            error: 'Błąd walidacji',
            message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
          });
        }
      }
      updateData.status = data.status as VisitStatus;
    }
    if (data.numerWSerii !== undefined) updateData.numerWSerii = data.numerWSerii;
    if (data.liczbaSerii !== undefined) updateData.liczbaSerii = data.liczbaSerii;
    if (data.cena !== undefined) updateData.cena = data.cena;

    const visit = await prisma.visit.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ visit });

    // Audit log
    await writeAuditLog(req, {
      action: 'UPDATE_VISIT',
      entity: 'Visit',
      entityId: visit.id,
    });
  } catch (error) {
    next(error);
  }
});

// Quick status update (all authenticated users can update status)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!visitStatusValues.includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status wizyty' });
    }

    const existingVisit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: { status: status as VisitStatus },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ visit });

    // Audit log
    await writeAuditLog(req, {
      action: 'UPDATE_VISIT_STATUS',
      entity: 'Visit',
      entityId: visit.id,
    });
  } catch (error) {
    next(error);
  }
});

// Delete visit (DOCTOR/ADMIN only - ASSISTANT cannot delete visits)
router.delete('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    await prisma.visit.delete({
      where: { id },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'DELETE_VISIT',
      entity: 'Visit',
      entityId: id,
    });

    res.json({ message: 'Wizyta została usunięta' });
  } catch (error) {
    next(error);
  }
});

export default router;
