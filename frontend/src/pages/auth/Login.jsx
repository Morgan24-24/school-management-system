import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    const map = { admin: '/admin/dashboard', headmaster: '/admin/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard', student: '/student/dashboard', accountant: '/accountant/dashboard' };
    navigate(map[user.role] || '/');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const u = await login(form);
      const map = { admin: '/admin/dashboard', headmaster: '/admin/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard', student: '/student/dashboard', accountant: '/accountant/dashboard' };
      toast.success(`Welcome back, ${u.firstName}!`);
      navigate(map[u.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-800 to-primary-700 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AcademicCapIcon className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">School Management</h1>
            <p className="text-primary-200 mt-1 text-sm">Sign in to your account</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Username or Email</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wide">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Admin', user: 'admin', pwd: 'Admin@123' },
                  { label: 'Headmaster', user: 'headmaster', pwd: 'Admin@123' },
                  { label: 'Accountant', user: 'accountant1', pwd: 'Admin@123' },
                  { label: 'Teacher', user: 'teacher1', pwd: 'Admin@123' },
                ].map(({ label, user: u, pwd }) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm({ username: u, password: pwd })}
                    className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-600 hover:text-primary-700 transition font-medium"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          © {new Date().getFullYear()} School Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
