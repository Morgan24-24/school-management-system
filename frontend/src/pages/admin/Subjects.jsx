import { useEffect, useState, useCallback } from 'react';
import { settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject_name: '', subject_code: '', subject_type: 'core', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await settingsAPI.getSubjects(); setSubjects(data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await settingsAPI.createSubject(form);
      toast.success('Subject created');
      setShowAdd(false);
      setForm({ subject_name: '', subject_code: '', subject_type: 'core', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const typeColor = { core: 'badge-blue', elective: 'badge-purple', optional: 'badge-gray' };

  const columns = [
    { key: 'subject_code', header: 'Code', render: v => <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{v}</span> },
    { key: 'subject_name', header: 'Subject Name', render: v => <span className="font-semibold">{v}</span> },
    { key: 'subject_type', header: 'Type', render: v => <span className={`badge ${typeColor[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'teachers', header: 'Assigned Teachers', render: v => <span className="text-xs text-gray-600">{v || <span className="text-gray-300">None assigned</span>}</span> },
    { key: 'description', header: 'Description', render: v => <span className="text-xs text-gray-500">{v || '-'}</span> },
    { key: 'status', header: 'Status', render: v => <span className={`badge ${v === 'active' ? 'badge-green' : 'badge-gray'}`}>{v}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Subjects</h1><p className="page-subtitle">Manage school subjects</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Subject</button>
      </div>
      <DataTable columns={columns} data={subjects} loading={loading} />
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Subject">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Subject Name *</label><input className="input" required value={form.subject_name} onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} /></div>
            <div><label className="label">Subject Code *</label><input className="input" required value={form.subject_code} onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} placeholder="e.g. MATH" /></div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.subject_type} onChange={e => setForm(f => ({ ...f, subject_type: e.target.value }))}>
              <option value="core">Core</option>
              <option value="elective">Elective</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Create Subject'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
