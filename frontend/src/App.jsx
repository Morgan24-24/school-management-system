import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/common/Layout';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StudentsPage from './pages/admin/Students';
import TeachersPage from './pages/admin/Teachers';
import ParentsPage from './pages/admin/Parents';
import ClassesPage from './pages/admin/Classes';
import SubjectsPage from './pages/admin/Subjects';
import AcademicYearsPage from './pages/admin/AcademicYears';
import SettingsPage from './pages/admin/Settings';
import ReportsPage from './pages/admin/Reports';
import AdminUsersPage from './pages/admin/AdminUsers';
import FeeManagementPage from './pages/fees/FeeManagement';
import RecordPaymentPage from './pages/fees/RecordPayment';
import FeeStructurePage from './pages/fees/FeeStructure';
import OutstandingFeesPage from './pages/fees/OutstandingFees';
import ExaminationListPage from './pages/examinations/ExaminationList';
import EnterScoresPage from './pages/examinations/EnterScores';
import TermResultsPage from './pages/examinations/TermResults';
import ReportCardsPage from './pages/examinations/ReportCards';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MyClassesPage from './pages/teacher/MyClasses';
import TeacherProfile from './pages/teacher/TeacherProfile';
import ParentDashboard from './pages/parent/ParentDashboard';
import ChildrenPage from './pages/parent/Children';
import ParentFees from './pages/parent/ParentFees';
import ParentReportCard from './pages/parent/ParentReportCard';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import AccountantPayments from './pages/accountant/Payments';
import LoadingSpinner from './components/common/LoadingSpinner';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const map = {
    admin: '/admin/dashboard', headmaster: '/admin/dashboard',
    teacher: '/teacher/dashboard', parent: '/parent/dashboard',
    student: '/student/dashboard', accountant: '/accountant/dashboard',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<div className="flex h-screen items-center justify-center text-gray-600">Access Denied</div>} />
        <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />

        {/* Admin / Headmaster */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin','headmaster']}><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="academic-years" element={<AcademicYearsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="system-users" element={<AdminUsersPage />} />
        </Route>

        {/* Fees — accessible by admin, headmaster, accountant */}
        <Route path="/fees" element={<ProtectedRoute roles={['admin','headmaster','accountant']}><Layout /></ProtectedRoute>}>
          <Route path="manage" element={<FeeManagementPage />} />
          <Route path="record" element={<RecordPaymentPage />} />
          <Route path="structure" element={<FeeStructurePage />} />
          <Route path="outstanding" element={<OutstandingFeesPage />} />
        </Route>

        {/* Examinations */}
        <Route path="/exams" element={<ProtectedRoute roles={['admin','headmaster','teacher']}><Layout /></ProtectedRoute>}>
          <Route path="" element={<ExaminationListPage />} />
          <Route path=":id/scores" element={<EnterScoresPage />} />
          <Route path="term-results" element={<TermResultsPage />} />
          <Route path="report-cards" element={<ReportCardsPage />} />
        </Route>

        {/* Teacher Portal */}
        <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="my-classes" element={<MyClassesPage />} />
          <Route path="exams" element={<ExaminationListPage />} />
          <Route path="exams/:id/scores" element={<EnterScoresPage />} />
          <Route path="profile" element={<TeacherProfile />} />
        </Route>

        {/* Parent Portal */}
        <Route path="/parent" element={<ProtectedRoute roles={['parent']}><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="fees" element={<ParentFees />} />
          <Route path="report-card" element={<ParentReportCard />} />
        </Route>

        {/* Student Portal */}
        <Route path="/student" element={<ProtectedRoute roles={['student']}><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Accountant Portal */}
        <Route path="/accountant" element={<ProtectedRoute roles={['accountant']}><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AccountantDashboard />} />
          <Route path="payments" element={<AccountantPayments />} />
          <Route path="record-payment" element={<RecordPaymentPage />} />
          <Route path="outstanding" element={<OutstandingFeesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
