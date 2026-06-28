import { useEffect, useState } from 'react';
import { settingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/common/LoadingSpinner';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    settingsAPI.get().then(r => { setSettings(r.data.data); setForm(r.data.data || {}); }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      await settingsAPI.update(fd);
      toast.success('Settings saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const input = (label, key, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type={type} className="input" placeholder={placeholder} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  const toggle = (label, key) => (
    <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked ? 1 : 0 }))} className="rounded border-gray-300 text-primary-600 w-4 h-4" />
    </label>
  );

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div><h1 className="page-title">System Settings</h1><p className="page-subtitle">Configure school information and integrations</p></div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">School Information</h2></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {input('School Name', 'school_name', 'text', 'e.g. Ghana Model School')}
              {input('School Motto', 'school_motto')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {input('Phone Number', 'school_phone', 'tel')}
              {input('Email Address', 'school_email', 'email')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {input('Website', 'school_website')}
              {input('Headmaster Name', 'headmaster_name')}
            </div>
            {input('Address', 'school_address')}
            <div>
              <label className="label">School Logo</label>
              <input type="file" accept="image/*" className="input" onChange={e => setForm(f => ({ ...f, logo: e.target.files[0] }))} />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="card">
            <div className="card-header"><h2 className="text-sm font-semibold">Email (SMTP)</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {input('SMTP Host', 'smtp_host', 'text', 'smtp.gmail.com')}
                {input('SMTP Port', 'smtp_port', 'number', '587')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {input('SMTP Username', 'smtp_user', 'email')}
                {input('SMTP Password', 'smtp_password', 'password')}
              </div>
              {input('From Address', 'smtp_from', 'text', 'School Name <no-reply@school.edu.gh>')}
              {toggle('Enable Email Notifications', 'email_enabled')}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="card">
            <div className="card-header"><h2 className="text-sm font-semibold">SMS (Twilio)</h2></div>
            <div className="p-6 space-y-4">
              {toggle('Enable SMS Notifications', 'sms_enabled')}
              <div className="grid grid-cols-2 gap-4">
                {input('Twilio Account SID', 'twilio_account_sid')}
                {input('Twilio Auth Token', 'twilio_auth_token', 'password')}
              </div>
              {input('Twilio Phone Number', 'twilio_phone', 'tel', '+1234567890')}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">System Preferences</h2></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {input('Fee Currency', 'fee_currency', 'text', 'GHS')}
              {input('Timezone', 'timezone', 'text', 'Africa/Accra')}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
