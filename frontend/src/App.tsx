import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import PatientFormPage from './pages/PatientFormPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import ConsultationViewPage from './pages/ConsultationViewPage';
import LabResultsPage from './pages/LabResultsPage';
import LabResultFormPage from './pages/LabResultFormPage';
import LabResultViewPage from './pages/LabResultViewPage';
import ScalpPhotosPage from './pages/ScalpPhotosPage';
import ScalpPhotoFormPage from './pages/ScalpPhotoFormPage';
import ScalpPhotoDetailPage from './pages/ScalpPhotoDetailPage';
import CarePlansPage from './pages/CarePlansPage';
import CarePlanDetailPage from './pages/CarePlanDetailPage';
import CarePlanFormPage from './pages/CarePlanFormPage';
import EmailComposePage from './pages/EmailComposePage';
import EmailTestPage from './pages/EmailTestPage';
import EmailHistoryPage from './pages/EmailHistoryPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import UserProfilePage from './pages/UserProfilePage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="/patients" />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="patients/:id/edit" element={<PatientFormPage />} />
        <Route path="patients/:id/consultations/new" element={<ConsultationFormPage />} />
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
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="care-plans/:id" element={<CarePlanDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App;


