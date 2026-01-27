import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = express.Router();

// Get all dashboard data in one request
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [patients, consultations, emails, upcomingVisits, weeklyRevenue] = await Promise.all([
      prisma.patient.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.consultation.findMany({
        select: {
          id: true,
          patientId: true,
          consultationDate: true,
        },
      }),
      prisma.email.findMany({
        where: { status: 'SENT' },
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
        where: {
          data: {
            gte: (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return today;
            })(),
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

    const patientsThisWeek = patients.filter(p => {
      const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      return createdAt > weekAgo;
    }).length;
    const consultationsThisWeek = consultations.filter(c => {
      const consultationDate = c.consultationDate instanceof Date ? c.consultationDate : new Date(c.consultationDate);
      return consultationDate > weekAgo;
    }).length;
    const patientsWithoutConsultation = patients.filter(p =>
      !consultations.some(c => c.patientId === p.id)
    ).length;

    // Build recent activities
    const activities: any[] = [];

    const sortedPatients = [...patients]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    sortedPatients.forEach(patient => {
      const createdAt = patient.createdAt instanceof Date ? patient.createdAt : new Date(patient.createdAt);
      activities.push({
        id: `patient-${patient.id}`,
        type: 'PATIENT',
        title: 'Dodano nowego pacjenta',
        subtitle: `${patient.firstName} ${patient.lastName}`,
        date: createdAt.toISOString(),
        link: `/patients/${patient.id}`,
      });
    });

    const sortedConsultations = [...consultations]
      .sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
      .slice(0, 3);

    sortedConsultations.forEach(consultation => {
      const patient = patients.find(p => p.id === consultation.patientId);
      const consultationDate = consultation.consultationDate instanceof Date 
        ? consultation.consultationDate 
        : new Date(consultation.consultationDate);
      activities.push({
        id: `consultation-${consultation.id}`,
        type: 'CONSULTATION',
        title: 'Konsultacja',
        subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
        date: consultationDate.toISOString(),
        link: `/patients/${consultation.patientId}`,
      });
    });

    emails.slice(0, 3).forEach((email: any) => {
      activities.push({
        id: `email-${email.id}`,
        type: 'EMAIL',
        title: 'Wysłano email',
        subtitle: email.patient ? `${email.patient.firstName} ${email.patient.lastName} - ${email.subject}` : email.subject,
        date: email.sentAt?.toISOString() || new Date().toISOString(),
        link: `/patients/${email.patientId}`,
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Find patients needing attention
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactivePatients = patients.filter(p => {
      const lastConsultation = consultations
        .filter(c => c.patientId === p.id)
        .sort((a, b) => {
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

    const patientsWithoutConsultations = patients.filter(p =>
      !consultations.some(c => c.patientId === p.id)
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
      recentActivities: activities.slice(0, 8),
      patientsNeedingAttention: patientsWithoutConsultations.slice(0, 5).map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      })),
      inactivePatients: inactivePatients.slice(0, 5).map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      })),
      upcomingVisits: upcomingVisits.map(v => ({
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
  } catch (error) {
    next(error);
  }
});

export default router;
