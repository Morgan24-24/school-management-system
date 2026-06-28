import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon, UsersIcon, AcademicCapIcon, CurrencyDollarIcon,
  DocumentTextIcon, ChartBarIcon, Cog6ToothIcon, ClipboardDocumentListIcon,
  BookOpenIcon, UserGroupIcon, CalendarIcon, ArrowRightOnRectangleIcon,
  BanknotesIcon, PrinterIcon, ReceiptPercentIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NAV = {
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: HomeIcon },
    { label: 'Students', to: '/admin/students', icon: AcademicCapIcon },
    { label: 'Teachers', to: '/admin/teachers', icon: UsersIcon },
    { label: 'Parents', to: '/admin/parents', icon: UserGroupIcon },
    { label: 'Classes', to: '/admin/classes', icon: BookOpenIcon },
    { label: 'Subjects', to: '/admin/subjects', icon: ClipboardDocumentListIcon },
    { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarIcon },
    { label: 'Fee Structure', to: '/fees/structure', icon: CurrencyDollarIcon },
    { label: 'Record Payment', to: '/fees/record', icon: BanknotesIcon },
    { label: 'Fee Management', to: '/fees/manage', icon: ReceiptPercentIcon },
    { label: 'Outstanding Fees', to: '/fees/outstanding', icon: ChartBarIcon },
    { label: 'Examinations', to: '/exams', icon: DocumentTextIcon },
    { label: 'Term Results', to: '/exams/term-results', icon: ChartBarIcon },
    { label: 'Report Cards', to: '/exams/report-cards', icon: PrinterIcon },
    { label: 'Reports', to: '/admin/reports', icon: ChartBarIcon },
    { label: 'System Users', to: '/admin/system-users', icon: ShieldCheckIcon },
    { label: 'Settings', to: '/admin/settings', icon: Cog6ToothIcon },
  ],
  headmaster: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: HomeIcon },
    { label: 'Students', to: '/admin/students', icon: AcademicCapIcon },
    { label: 'Teachers', to: '/admin/teachers', icon: UsersIcon },
    { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarIcon },
    { label: 'Fee Structure', to: '/fees/structure', icon: CurrencyDollarIcon },
    { label: 'Record Payment', to: '/fees/record', icon: BanknotesIcon },
    { label: 'Fee Management', to: '/fees/manage', icon: ReceiptPercentIcon },
    { label: 'Outstanding Fees', to: '/fees/outstanding', icon: ChartBarIcon },
    { label: 'Examinations', to: '/exams', icon: DocumentTextIcon },
    { label: 'Term Results', to: '/exams/term-results', icon: ChartBarIcon },
    { label: 'Report Cards', to: '/exams/report-cards', icon: PrinterIcon },
    { label: 'Reports', to: '/admin/reports', icon: ChartBarIcon },
    { label: 'Settings', to: '/admin/settings', icon: Cog6ToothIcon },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: HomeIcon },
    { label: 'My Classes', to: '/teacher/my-classes', icon: BookOpenIcon },
    { label: 'Examinations', to: '/teacher/exams', icon: DocumentTextIcon },
  ],
  parent: [
    { label: 'Dashboard', to: '/parent/dashboard', icon: HomeIcon },
    { label: 'My Children', to: '/parent/children', icon: UsersIcon },
    { label: 'Fee Status', to: '/parent/fees', icon: CurrencyDollarIcon },
    { label: 'Report Cards', to: '/parent/report-card', icon: PrinterIcon },
  ],
  student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: HomeIcon },
    { label: 'My Profile', to: '/student/profile', icon: UsersIcon },
  ],
  accountant: [
    { label: 'Dashboard', to: '/accountant/dashboard', icon: HomeIcon },
    { label: 'Record Payment', to: '/accountant/record-payment', icon: BanknotesIcon },
    { label: 'Payment History', to: '/accountant/payments', icon: ReceiptPercentIcon },
    { label: 'Outstanding Fees', to: '/accountant/outstanding', icon: ChartBarIcon },
  ],
};

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = NAV[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className={`flex flex-col bg-primary-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <AcademicCapIcon className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-tight truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-primary-300 capitalize">{user?.role} Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-primary-300 capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link-inactive w-full"
          title={collapsed ? 'Logout' : undefined}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
