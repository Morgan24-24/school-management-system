import { useEffect, useState } from 'react';
import { authAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { KeyIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    authAPI.getProfile().then(r => setProfile(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!profile) return <p className="text-red-500">Failed to load profile</p>;

  const p = profile.profile || {};
  const u = profile;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div><h1 className="page-title">My Profile</h1></div>
      </div>
      <div className="card">
        <div className="p-6 flex items-center gap-5 border-b border-gray-100">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-3xl font-bold">{u.first_name?.[0]}{u.last_name?.[0]}</div>
          <div>
            <h2 className="text-xl font-bold">{u.first_name} {u.last_name}</h2>
            <p className="text-gray-500">{p.class_name || 'No class assigned'}</p>
            <p className="text-gray-400 text-sm font-mono">{p.admission_number}</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            ['Student ID', p.student_id_generated],
            ['Admission Number', p.admission_number],
            ['Gender', p.gender],
            ['Date of Birth', p.date_of_birth],
            ['Email', u.email],
            ['Phone', u.phone],
            ['Guardian', p.guardian_name],
            ['Guardian Phone', p.guardian_phone],
            ['Address', p.address],
            ['Status', p.status],
          ].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
              <p className="font-medium text-sm mt-0.5 capitalize">{v || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          </div>
        </div>
        <form onSubmit={handleChangePw} className="p-6 space-y-4 max-w-sm">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" placeholder="Enter current password"
              value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" placeholder="Min 8 characters"
              value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" placeholder="Repeat new password"
              value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
