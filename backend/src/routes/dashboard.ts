import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { startOfTodayWarsaw, weekRangeWarsaw } from '../utils/warsawTz';

const router = express.Router();

// Get all dashboard data in one request
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [patients, consultations, emails, visits, labResults, scalpPhotos, carePlans, upcomingVisits, weeklyRevenue] = await Promise.all([
      prisma.patient.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.consultation.findMany({
        select: {
          id: true,
          patientId: true,
          consultationDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.emailHistory.findMany({
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
          data: {
            gte: startOfTodayWarsaw(),
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
      // Weekly revenue (Mon–Sun Europe/Warsaw)
      (async () => {
        const { start: startOfWeek, end: endOfWeek } = weekRangeWarsaw();

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

    // Build recent activities - wszystkie zmiany
    const activities: any[] = [];

    // Pacjenci - dodanie i edycja
    patients.forEach((patient: any) => {
      const createdAt = patient.createdAt instanceof Date ? patient.createdAt : new Date(patient.createdAt);
      const updatedAt = patient.updatedAt instanceof Date ? patient.updatedAt : new Date(patient.updatedAt);
      
      // Dodanie pacjenta
      activities.push({
        id: `patient-create-${patient.id}`,
        type: 'PATIENT',
        title: 'Dodano nowego pacjenta',
        subtitle: `${patient.firstName} ${patient.lastName}`,
        date: createdAt.toISOString(),
        link: `/patients/${patient.id}`,
      });

      // Edycja pacjenta (jeśli była edytowana)
      if (updatedAt.getTime() > createdAt.getTime() + 1000) { // +1s aby uniknąć przypadków gdzie są identyczne
        activities.push({
          id: `patient-update-${patient.id}-${updatedAt.getTime()}`,
          type: 'PATIENT_EDIT',
          title: 'Zaktualizowano dane pacjenta',
          subtitle: `${patient.firstName} ${patient.lastName}`,
          date: updatedAt.toISOString(),
          link: `/patients/${patient.id}`,
        });
      }
    });

    // Konsultacje - dodanie i edycja
    consultations.forEach((consultation: any) => {
      const patient = patients.find((p: any) => p.id === consultation.patientId);
      const createdAt = consultation.createdAt instanceof Date ? consultation.createdAt : new Date(consultation.createdAt);
      const updatedAt = consultation.updatedAt instanceof Date ? consultation.updatedAt : new Date(consultation.updatedAt);
      const consultationDate = consultation.consultationDate instanceof Date 
        ? consultation.consultationDate 
        : new Date(consultation.consultationDate);

      // Dodanie konsultacji
      activities.push({
        id: `consultation-create-${consultation.id}`,
        type: 'CONSULTATION',
        title: 'Dodano konsultację',
        subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
        date: createdAt.toISOString(),
        link: `/patients/${consultation.patientId}`,
      });

      // Edycja konsultacji
      if (updatedAt.getTime() > createdAt.getTime() + 1000) {
        activities.push({
          id: `consultation-update-${consultation.id}-${updatedAt.getTime()}`,
          type: 'CONSULTATION_EDIT',
          title: 'Zaktualizowano konsultację',
          subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
          date: updatedAt.toISOString(),
          link: `/patients/${consultation.patientId}`,
        });
      }
    });

    // Wizyty - dodanie i edycja
    visits.forEach((visit: any) => {
      const createdAt = visit.createdAt instanceof Date ? visit.createdAt : new Date(visit.createdAt);
      const updatedAt = visit.updatedAt instanceof Date ? visit.updatedAt : new Date(visit.updatedAt);
      const patient = visit.patient || patients.find((p: any) => p.id === visit.patientId);

      // Dodanie wizyty
      activities.push({
        id: `visit-create-${visit.id}`,
        type: 'VISIT',
        title: 'Dodano wizytę',
        subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${visit.rodzajZabiegu}` : visit.rodzajZabiegu,
        date: createdAt.toISOString(),
        link: `/patients/${visit.patientId}`,
      });

      // Edycja wizyty
      if (updatedAt.getTime() > createdAt.getTime() + 1000) {
        activities.push({
          id: `visit-update-${visit.id}-${updatedAt.getTime()}`,
          type: 'VISIT_EDIT',
          title: 'Zaktualizowano wizytę',
          subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${visit.rodzajZabiegu}` : visit.rodzajZabiegu,
          date: updatedAt.toISOString(),
          link: `/patients/${visit.patientId}`,
        });
      }
    });

    // Lab Results - dodanie i edycja
    labResults.forEach((labResult: any) => {
      const createdAt = labResult.createdAt instanceof Date ? labResult.createdAt : new Date(labResult.createdAt);
      const updatedAt = labResult.updatedAt instanceof Date ? labResult.updatedAt : new Date(labResult.updatedAt);
      const patient = labResult.patient || patients.find((p: any) => p.id === labResult.patientId);
      const labDate = labResult.date instanceof Date ? labResult.date : new Date(labResult.date);

      // Dodanie wyniku
      activities.push({
        id: `labresult-create-${labResult.id}`,
        type: 'LAB_RESULT',
        title: 'Dodano wynik badań',
        subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
        date: createdAt.toISOString(),
        link: `/patients/${labResult.patientId}/lab-results`,
      });

      // Edycja wyniku
      if (updatedAt.getTime() > createdAt.getTime() + 1000) {
        activities.push({
          id: `labresult-update-${labResult.id}-${updatedAt.getTime()}`,
          type: 'LAB_RESULT_EDIT',
          title: 'Zaktualizowano wynik badań',
          subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
          date: updatedAt.toISOString(),
          link: `/patients/${labResult.patientId}/lab-results`,
        });
      }
    });

    // Scalp Photos - tylko dodanie (nie ma updatedAt)
    scalpPhotos.forEach((photo: any) => {
      const createdAt = photo.createdAt instanceof Date ? photo.createdAt : new Date(photo.createdAt);
      const patient = photo.patient || patients.find((p: any) => p.id === photo.patientId);

      activities.push({
        id: `scalpphoto-create-${photo.id}`,
        type: 'SCALP_PHOTO',
        title: 'Dodano zdjęcie skóry głowy',
        subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${photo.originalFilename}` : photo.originalFilename,
        date: createdAt.toISOString(),
        link: `/patients/${photo.patientId}/scalp-photos`,
      });
    });

    // Care Plans - dodanie i edycja
    carePlans.forEach((carePlan: any) => {
      const createdAt = carePlan.createdAt instanceof Date ? carePlan.createdAt : new Date(carePlan.createdAt);
      const updatedAt = carePlan.updatedAt instanceof Date ? carePlan.updatedAt : new Date(carePlan.updatedAt);
      const patient = carePlan.patient || patients.find((p: any) => p.id === carePlan.patientId);

      // Dodanie planu
      activities.push({
        id: `careplan-create-${carePlan.id}`,
        type: 'CARE_PLAN',
        title: 'Dodano plan leczenia',
        subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${carePlan.title}` : carePlan.title,
        date: createdAt.toISOString(),
        link: `/patients/${carePlan.patientId}/care-plans`,
      });

      // Edycja planu
      if (updatedAt.getTime() > createdAt.getTime() + 1000) {
        activities.push({
          id: `careplan-update-${carePlan.id}-${updatedAt.getTime()}`,
          type: 'CARE_PLAN_EDIT',
          title: 'Zaktualizowano plan leczenia',
          subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${carePlan.title}` : carePlan.title,
          date: updatedAt.toISOString(),
          link: `/patients/${carePlan.patientId}/care-plans`,
        });
      }
    });

    // Emails - tylko wysłane
    emails.forEach((email: any) => {
      const sentAt = email.sentAt instanceof Date ? email.sentAt : new Date(email.sentAt);
      activities.push({
        id: `email-${email.id}`,
        type: 'EMAIL',
        title: 'Wysłano email',
        subtitle: email.patient ? `${email.patient.firstName} ${email.patient.lastName} - ${email.subject}` : email.subject,
        date: sentAt.toISOString(),
        link: `/patients/${email.patientId}`,
      });
    });

    // Sortuj wszystkie aktywności po dacie (najnowsze pierwsze)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    console.error('[Dashboard] Error fetching dashboard data:', error);
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

export default router;
