import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { buildAllActivities } from '../services/dashboardService';

const router = express.Router();

/**
 * [SEC-4] Build a Prisma `where` filter scoped to clinic if set.
 * ADMIN / DOCTOR / ASSISTANT → all patients (optionally filtered by clinicId).
 */
function patientWhereForUser(user: AuthRequest['user']): Prisma.PatientWhereInput {
  if (!user) return {};
  const where: Prisma.PatientWhereInput = {};

  if (user.clinicId) {
    where.clinicId = user.clinicId;
  }

  // All roles now see all patients in the clinic

  return where;
}

// Get all dashboard data in one request
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // [SEC-4] Scope all queries to the user's accessible patients
    const accessFilter = patientWhereForUser(req.user);
    const patientWhere: Prisma.PatientWhereInput = { isArchived: false, ...accessFilter };

    // Collect accessible patient IDs for filtering related entities
    const accessiblePatientIds = (await prisma.patient.findMany({
      where: patientWhere,
      select: { id: true },
      take: 500,
    })).map(p => p.id);

    const [patients, consultations, emails, visits, labResults, scalpPhotos, carePlans, upcomingVisits, weeklyRevenue] = await Promise.all([
      prisma.patient.findMany({
        where: patientWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.consultation.findMany({
        where: { patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          consultationDate: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailHistory.findMany({
        where: { status: 'SENT', patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          subject: true,
          sentAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        take: 10,
      }),
      prisma.visit.findMany({
        where: { patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          data: true,
          rodzajZabiegu: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.labResult.findMany({
        where: { patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          date: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.scalpPhoto.findMany({
        where: { patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          originalFilename: true,
          createdAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.carePlan.findMany({
        where: { patientId: { in: accessiblePatientIds } },
        select: {
          id: true,
          patientId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.visit.findMany({
        where: {
          patientId: { in: accessiblePatientIds },
          data: {
            gte: (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return today;
            })(),
          },
          status: { in: ['ZAPLANOWANA', 'POTWIERDZONA'] },
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
      }),
      // Weekly revenue calculation
      (async () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999);

        const [plannedVisits, completedVisits, visitsByStatus] = await Promise.all([
          prisma.visit.findMany({
            where: {
              data: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
              status: 'ZAPLANOWANA',
              cena: { not: null },
            },
            select: { cena: true },
          }),
          prisma.visit.findMany({
            where: {
              data: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
              status: 'ODBYTA',
              cena: { not: null },
            },
            select: { cena: true },
          }),
          prisma.visit.groupBy({
            by: ['status'],
            where: {
              data: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
            },
            _count: { id: true },
          }),
        ]);

        const plannedRevenue = plannedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);
        const completedRevenue = completedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);

        const statusCounts: Record<string, number> = {};
        visitsByStatus.forEach((item) => {
          statusCounts[item.status] = item._count.id;
        });

        return {
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
        };
      })(),
    ]);

    // Calculate statistics
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const patientsThisWeek = patients.filter((p: any) => {
      const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      return createdAt > weekAgo;
    }).length;
    const consultationsThisWeek = consultations.filter((c: any) => {
      const consultationDate = c.consultationDate instanceof Date ? c.consultationDate : new Date(c.consultationDate);
      return consultationDate > weekAgo;
    }).length;
    const patientsWithoutConsultation = patients.filter((p: any) =>
      !consultations.some((c: any) => c.patientId === p.id)
    ).length;

    // [CODE-2] Build activities using extracted service (eliminates 7x duplication)
    const activities = buildAllActivities(
      { patients, consultations, visits, labResults, scalpPhotos, carePlans, emails },
      50,
    );

    // Find patients needing attention
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactivePatients = patients.filter((p: any) => {
      const lastConsultation = consultations
        .filter((c: any) => c.patientId === p.id)
        .sort((a: any, b: any) => {
          const dateA = a.consultationDate instanceof Date ? a.consultationDate : new Date(a.consultationDate);
          const dateB = b.consultationDate instanceof Date ? b.consultationDate : new Date(b.consultationDate);
          return dateB.getTime() - dateA.getTime();
        })[0];
      if (!lastConsultation) return false;
      const lastDate = lastConsultation.consultationDate instanceof Date
        ? lastConsultation.consultationDate
        : new Date(lastConsultation.consultationDate);
      return lastDate < thirtyDaysAgo;
    });

    const patientsWithoutConsultations = patients.filter((p: any) =>
      !consultations.some((c: any) => c.patientId === p.id)
    );

    res.json({
      stats: {
        patientsCount: patients.length,
        consultationsCount: consultations.length,
        emailsSentCount: emails.length,
        patientsThisWeek,
        consultationsThisWeek,
        patientsWithoutConsultation,
      },
      recentActivities: activities.slice(0, 30), // Zwiększono limit do 30 aktywności
      patientsNeedingAttention: patientsWithoutConsultations.slice(0, 5).map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      })),
      inactivePatients: inactivePatients.slice(0, 5).map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      })),
      upcomingVisits: upcomingVisits.map((v: any) => ({
        id: v.id,
        data: (v.data instanceof Date ? v.data : new Date(v.data)).toISOString(),
        rodzajZabiegu: v.rodzajZabiegu,
        status: v.status,
        numerWSerii: v.numerWSerii,
        liczbaSerii: v.liczbaSerii,
        cena: v.cena,
        patient: v.patient,
      })),
      weeklyRevenue,
    });
  } catch (error: any) {
    logger.error('[Dashboard] Error fetching dashboard data:', error);
    // Zwróć bardziej szczegółowy błąd
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Błąd bazy danych',
        message: 'Wystąpił problem z dostępem do danych',
      });
    }
    next(error);
  }
});

// Revenue for a custom date range
// GET /dashboard/revenue?from=2025-01-01&to=2025-01-31
router.get('/revenue', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d;
    })();
    const toDate = to ? new Date(to as string) : (() => {
      const d = new Date(); d.setHours(23, 59, 59, 999); return d;
    })();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Nieprawidłowy format daty (użyj YYYY-MM-DD)' });
    }

    toDate.setHours(23, 59, 59, 999);

    const [plannedVisits, completedVisits, visitsByStatus, newPatients] = await Promise.all([
      prisma.visit.findMany({
        where: { data: { gte: fromDate, lte: toDate }, status: 'ZAPLANOWANA', cena: { not: null } },
        select: { cena: true, data: true },
      }),
      prisma.visit.findMany({
        where: { data: { gte: fromDate, lte: toDate }, status: 'ODBYTA', cena: { not: null } },
        select: { cena: true, data: true },
      }),
      prisma.visit.groupBy({
        by: ['status'],
        where: { data: { gte: fromDate, lte: toDate } },
        _count: { id: true },
        _sum: { cena: true },
      }),
      prisma.patient.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
    ]);

    const plannedRevenue = plannedVisits.reduce((s, v) => s + (Number(v.cena) || 0), 0);
    const completedRevenue = completedVisits.reduce((s, v) => s + (Number(v.cena) || 0), 0);

    const statusSummary: Record<string, { count: number; revenue: number }> = {};
    visitsByStatus.forEach(item => {
      statusSummary[item.status] = {
        count: item._count.id,
        revenue: Number(item._sum.cena) || 0,
      };
    });

    // Build daily revenue breakdown
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / dayMs);
    const useWeekly = diffDays > 62; // >2 months → show weekly buckets instead of daily

    const buckets: Record<string, { planned: number; completed: number }> = {};
    const allVisits = [...plannedVisits.map(v => ({ ...v, status: 'ZAPLANOWANA' })),
    ...completedVisits.map(v => ({ ...v, status: 'ODBYTA' }))];

    allVisits.forEach(v => {
      const d = new Date(v.data);
      let key: string;
      if (useWeekly) {
        // ISO week start (Monday)
        const dow = d.getDay() || 7;
        const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
        key = mon.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }
      if (!buckets[key]) buckets[key] = { planned: 0, completed: 0 };
      if (v.status === 'ZAPLANOWANA') buckets[key].planned += Number(v.cena) || 0;
      else buckets[key].completed += Number(v.cena) || 0;
    });

    const timeline = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals, total: vals.planned + vals.completed }));

    return res.json({
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      summary: {
        plannedRevenue,
        completedRevenue,
        totalRevenue: plannedRevenue + completedRevenue,
        newPatients,
        statusSummary,
        granularity: useWeekly ? 'weekly' : 'daily',
      },
      timeline,
    });
  } catch (error) {
    next(error);
  }
});

// Patient actions (visit events) for the dashboard
router.get('/visit-events', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const events = await prisma.visitEvent.findMany({
      where: {
        eventType: { in: ['CONFIRMED', 'CANCELED', 'RESCHEDULE_REQUESTED', 'REMINDER_SENT'] },
      },
      include: {
        visit: {
          select: {
            id: true,
            rodzajZabiegu: true,
            data: true,
            status: true,
            patientId: true,
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

// Mark visit events as read
router.post('/visit-events/mark-read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { eventIds } = req.body;
    // [SEC-5] Limit array size to prevent DoS
    if (!Array.isArray(eventIds) || eventIds.length === 0 || eventIds.length > 200) {
      return res.status(400).json({ error: 'eventIds is required (max 200)' });
    }
    await prisma.visitEvent.updateMany({
      where: { id: { in: eventIds } },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Clear old / read visit events
router.delete('/visit-events/clear', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const mode = (req.query.mode as string) || 'read'; // 'read' = only read, 'all' = everything
    const where: any = {
      eventType: { in: ['CONFIRMED', 'CANCELED', 'RESCHEDULE_REQUESTED', 'REMINDER_SENT'] },
    };
    if (mode === 'read') {
      where.isRead = true;
    }
    const result = await prisma.visitEvent.deleteMany({ where });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    next(error);
  }
});

export default router;

