import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TabLayout from './components/TabLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import JoinTeam from './pages/JoinTeam';
import WeldPage from './pages/WeldPage';
import TroubleshootPage from './pages/TroubleshootPage';
import ReferencePage from './pages/ReferencePage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import LearnPage from './pages/LearnPage';
import ManagerDashboard from './pages/ManagerDashboard';
import MemberDetail from './pages/MemberDetail';
import TeamSettings from './pages/TeamSettings';
import TrainingHome from './pages/training/TrainingHome';
import ModuleList from './pages/training/ModuleList';
import ModuleContent from './pages/training/ModuleContent';
import ExamSelection from './pages/training/ExamSelection';
import ExamEngine from './pages/training/ExamEngine';
import ExamScoreReport from './pages/training/ExamScoreReport';
import ReadinessDashboard from './pages/training/ReadinessDashboard';
import SpacedRepetitionQueue from './pages/training/SpacedRepetitionQueue';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/join" element={<JoinTeam />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TabLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/weld" replace />} />
          <Route path="weld" element={<WeldPage />} />
          <Route path="troubleshoot" element={<TroubleshootPage />} />
          <Route path="reference" element={<ReferencePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="dashboard/member/:userId" element={<MemberDetail />} />
          <Route path="dashboard/settings" element={<TeamSettings />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="training" element={<TrainingHome />} />
          <Route path="training/sr" element={<SpacedRepetitionQueue />} />
          <Route path="training/:certLevel" element={<ModuleList />} />
          <Route path="training/:certLevel/readiness" element={<ReadinessDashboard />} />
          <Route path="training/:certLevel/exam" element={<ExamSelection />} />
          <Route path="training/:certLevel/exam/run" element={<ExamEngine />} />
          <Route path="training/:certLevel/exam/score/:attemptId" element={<ExamScoreReport />} />
          <Route path="training/:certLevel/:moduleId" element={<ModuleContent />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
