import { useEffect, useState, useCallback } from 'react';
import { adminUsersAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import { PlusIcon, CheckCircleIcon, ClipboardDocumentIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ROLE_BADGE = { admin: 'badge-red', headmaster: 'badge-blue', accountant: 'badge-green' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'headmaster' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminUsersAPI.getAll();
      setUsers(data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await adminUsersAPI.create(form);
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'headmaster' });
      load();
      setCredentials({
        name: `${form.first_name} ${form.last_name}`,
        role: data.data.role,
        username: data.data.username,
        password: data.data.temporaryPassword,
      });
      setShowCredentials(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create user'); }
    finally { setSubmitting(false); }
  };

  const onDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try { await adminUsersAPI.deactivate(id); toast.success('User deactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));

  const f = (label, key, type = 'text') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type={type} className="input" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Users</h1>
          <p className="page-subtitle">Manage admin, headmaster and accountant accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add User</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'} capitalize`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active && (
                      <button onClick={() => onDeactivate(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Deactivate">
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No system users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create System User" size="lg">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {f('First Name *', 'first_name')}
            {f('Last Name *', 'last_name')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f('Email', 'email', 'email')}
            {f('Phone', 'phone', 'tel')}
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="headmaster">Headmaster</option>
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            A username and temporary password will be generated automatically and shown after creation.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal open={showCredentials} onClose={() => setShowCredentials(false)} title="Account Created">
        {credentials && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-800">{credentials.name} ({credentials.role}) account created!</p>
              <p className="text-sm text-green-600 mt-1">Share these login details with the user.</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Username', value: credentials.username },
                { label: 'Temporary Password', value: credentials.password },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="font-mono font-semibold text-gray-900 mt-0.5">{value}</p>
                  </div>
                  <button onClick={() => copyToClipboard(value)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">The user should change their password after first login.</p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowCredentials(false)} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
