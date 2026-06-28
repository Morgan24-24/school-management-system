import { useEffect, useState, useCallback } from 'react';
import { feeAPI, settingsAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function FeeStructurePage() {
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ class_id: '', academic_year_id: '', term_id: '' });
  const [form, setForm] = useState({ class_id: '', academic_year_id: '', term_id: '', fee_type: '', amount: '', description: '', is_mandatory: true, due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await feeAPI.getStructures(filters); setStructures(data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([settingsAPI.getClasses(), settingsAPI.getAcademicYears()])
      .then(([c, y]) => { setClasses(c.data.data); setYears(y.data.data); });
  }, []);

  useEffect(() => {
    if (form.academic_year_id || filters.academic_year_id) {
      const id = form.academic_year_id || filters.academic_year_id;
      settingsAPI.getTerms({ academic_year_id: id }).then(r => setTerms(r.data.data));
    }
  }, [form.academic_year_id, filters.academic_year_id]);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await feeAPI.createStructure(form); toast.success('Fee structure created'); setShowAdd(false); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this fee structure?')) return;
    try { await feeAPI.deleteStructure(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const grouped = structures.reduce((acc, s) => {
    const key = `${s.class_name} — ${s.term_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Fee Structure</h1><p className="page-subtitle">Define fee amounts per class and term</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Fee</button>
      </div>

      <div className="flex gap-3">
        <select className="input w-44" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
        <select className="input w-44" value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">All Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
        </select>
        <select className="input w-44" value={filters.term_id} onChange={e => setFilters(f => ({ ...f, term_id: e.target.value }))}>
          <option value="">All Terms</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
        </select>
      </div>

      {loading && <PageLoader />}

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">{group}</h2>
            <span className="text-sm text-gray-500">Total: GHS {items.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toFixed(2)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Fee Type</th><th>Amount (GHS)</th><th>Due Date</th><th>Mandatory</th><th>Description</th><th></th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.fee_type}</td>
                    <td className="font-bold text-green-700">GHS {parseFloat(s.amount).toFixed(2)}</td>
                    <td className="text-xs text-gray-500">{s.due_date || '-'}</td>
                    <td>{s.is_mandatory ? <span className="badge-green badge">Yes</span> : <span className="badge-gray badge">No</span>}</td>
                    <td className="text-xs text-gray-500">{s.description || '-'}</td>
                    <td><button onClick={() => onDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="card p-12 text-center text-gray-400">No fee structures defined. Click "Add Fee" to get started.</div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Fee Structure">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input" required value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year *</label>
              <select className="input" required value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                <option value="">Select year</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Term *</label>
              <select className="input" required value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div><label className="label">Fee Type *</label><input className="input" required value={form.fee_type} onChange={e => setForm(f => ({ ...f, fee_type: e.target.value }))} placeholder="e.g. Tuition Fee, PTA" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount (GHS) *</label><input type="number" step="0.01" min="0" className="input" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_mandatory} onChange={e => setForm(f => ({ ...f, is_mandatory: e.target.checked }))} className="rounded" /><span className="text-sm">Mandatory fee</span></label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Create Fee'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
