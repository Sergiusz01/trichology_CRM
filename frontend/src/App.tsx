import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const PatientFormPage = lazy(() => import('./pages/PatientFormPage'));
const ConsultationFormPage = lazy(() => import('./pages/ConsultationFormPage'));
const ConsultationViewPage = lazy(() => import('./pages/ConsultationViewPage'));
const ConsultationsPage = lazy(() => import('./pages/ConsultationsPage'));
const ConsultationTemplatesPage = lazy(() => import('./pages/ConsultationTemplatesPage'));
const LabResultTemplatesPage = lazy(() => import('./pages/LabResultTemplatesPage'));
const LabResultsPage = lazy(() => import('./pages/LabResultsPage'));
const LabResultFormPage = lazy(() => import('./pages/LabResultFormPage'));
const LabResultViewPage = lazy(() => import('./pages/LabResultViewPage'));
const ScalpPhotosPage = lazy(() => import('./pages/ScalpPhotosPage'));
const ScalpPhotoFormPage = lazy(() => import('./pages/ScalpPhotoFormPage'));
const ScalpPhotoDetailPage = lazy(() => import('./pages/ScalpPhotoDetailPage'));
const CarePlansPage = lazy(() => import('./pages/CarePlansPage'));
const CarePlanDetailPage = lazy(() => import('./pages/CarePlanDetailPage'));
const CarePlanFormPage = lazy(() => import('./pages/CarePlanFormPage'));
const EmailComposePage = lazy(() => import('./pages/EmailComposePage'));
const EmailTestPage = lazy(() => import('./pages/EmailTestPage'));
const EmailHistoryPage = lazy(() => import('./pages/EmailHistoryPage'));
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const VisitFormPage = lazy(() => import('./pages/VisitFormPage'));
const RevenuePage = lazy(() => import('./pages/RevenuePage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      gap: 2,
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary">
      Ładowanie...
    </Typography>
  </Box>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Ładowanie...
        </Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={!user ? <LoginPage /> : <Navigate to="/" />}
          />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="patients/new" element={<PatientFormPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="patients/:id/edit" element={<PatientFormPage />} />
            <Route path="patients/:id/consultations/new" element={<ConsultationFormPage />} />
            <Route path="patients/:id/visits/new" element={<VisitFormPage />} />
            <Route path="visits/new" element={<VisitFormPage />} />
            <Route path="consultations" element={<ConsultationsPage />} />
            <Route path="consultations/:id" element={<ConsultationViewPage />} />
            <Route path="consultations/:id/edit" element={<ConsultationFormPage />} />
            <Route path="patients/:id/lab-results" element={<LabResultsPage />} />
            <Route path="patients/:id/lab-results/new" element={<LabResultFormPage />} />
            <Route path="patients/:id/lab-results/:labResultId" element={<LabResultViewPage />} />
            <Route path="patients/:id/lab-results/:labResultId/edit" element={<LabResultFormPage />} />
            <Route path="patients/:id/scalp-photos" element={<ScalpPhotosPage />} />
            <Route path="patients/:id/scalp-photos/new" element={<ScalpPhotoFormPage />} />
            <Route path="patients/:id/scalp-photos/:photoId" element={<ScalpPhotoDetailPage />} />
            <Route path="patients/:id/care-plans" element={<CarePlansPage />} />
            <Route path="patients/:id/care-plans/new" element={<CarePlanFormPage />} />
            <Route path="patients/:id/care-plans/:carePlanId" element={<CarePlanDetailPage />} />
            <Route path="patients/:id/care-plans/:carePlanId/edit" element={<CarePlanFormPage />} />
            <Route path="patients/:id/email" element={<EmailComposePage />} />
            <Route path="patients/:id/email-history" element={<EmailHistoryPage />} />
            <Route path="email/history" element={<EmailHistoryPage />} />
            <Route path="email/test" element={<EmailTestPage />} />
            <Route path="email/templates" element={<EmailTemplatesPage />} />
            <Route path="consultation-templates" element={<ConsultationTemplatesPage />} />
            <Route path="lab-result-templates" element={<LabResultTemplatesPage />} />
            <Route path="activity" element={<ActivityLogPage />} />
            <Route path="profile" element={<UserProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="care-plans/:id" element={<CarePlanDetailPage />} />
            <Route path="scalp-photos/:photoId" element={<ScalpPhotoDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;


