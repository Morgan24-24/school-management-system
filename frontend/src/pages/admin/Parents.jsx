import { useEffect, useState, useCallback } from 'react';
import { parentAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', occupation: '', relationship_type: 'guardian' });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await parentAPI.getAll({ page, limit: 20, search });
      setParents(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await parentAPI.create(form);
      toast.success(`Parent added! Login: ${data.data.username} / ${data.data.temporaryPassword}`);
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', occupation: '', relationship_type: 'guardian' });
      load(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const columns = [
    { key: 'first_name', header: 'Name', render: (_, r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold">{r.first_name?.[0]}{r.last_name?.[0]}</div>
        <div><p className="font-medium">{r.first_name} {r.last_name}</p><p className="text-xs text-gray-400">{r.email}</p></div>
      </div>
    )},
    { key: 'phone', header: 'Phone', render: v => v || '-' },
    { key: 'occupation', header: 'Occupation', render: v => v || '-' },
    { key: 'relationship_type', header: 'Relationship', render: v => <span className="capitalize">{v}</span> },
    { key: 'children_count', header: 'Children', render: v => <span className="badge-blue badge">{v || 0}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Parents</h1><p className="page-subtitle">Manage parent / guardian accounts</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Parent</button>
      </div>
      <DataTable columns={columns} data={parents} loading={loading} pagination={pagination} onPageChange={load} searchValue={search} onSearch={setSearch} />
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register Parent">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name *</label><input className="input" required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
            <div><label className="label">Last Name *</label><input className="input" required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} /></div>
            <div>
              <label className="label">Relationship</label>
              <select className="input" value={form.relationship_type} onChange={e => setForm(f => ({ ...f, relationship_type: e.target.value }))}>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Register Parent'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
