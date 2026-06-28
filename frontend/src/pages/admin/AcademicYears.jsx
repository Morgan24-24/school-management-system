import { useEffect, useState, useCallback } from 'react';
import { settingsAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AcademicYearsPage() {
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [yearForm, setYearForm] = useState({ year_name: '', start_date: '', end_date: '', is_current: false });
  const [termForm, setTermForm] = useState({ academic_year_id: '', term_name: '', term_number: 1, start_date: '', end_date: '', is_current: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await settingsAPI.getAcademicYears();
      setYears(data.data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadTerms = useCallback(async (yearId) => {
    try {
      const { data } = await settingsAPI.getTerms({ academic_year_id: yearId });
      setTerms(data.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selectedYear) loadTerms(selectedYear.id); }, [selectedYear]);

  const addYear = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await settingsAPI.createAcademicYear(yearForm); toast.success('Year created'); setShowAddYear(false); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const addTerm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await settingsAPI.createTerm({ ...termForm, academic_year_id: selectedYear?.id });
      toast.success('Term created');
      setShowAddTerm(false);
      if (selectedYear) loadTerms(selectedYear.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Academic Years & Terms</h1><p className="page-subtitle">Configure academic calendar</p></div>
        <button onClick={() => setShowAddYear(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Year</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">Academic Years</h2></div>
          <div className="divide-y divide-gray-50">
            {years.map(y => (
              <button key={y.id} onClick={() => setSelectedYear(y)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left ${selectedYear?.id === y.id ? 'bg-primary-50' : ''}`}>
                <div>
                  <p className="font-semibold text-gray-900">{y.year_name}</p>
                  <p className="text-xs text-gray-500">{y.start_date} → {y.end_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  {y.is_current ? <span className="badge-green badge">Current</span> : null}
                  <span className={`badge ${y.status === 'active' ? 'badge-blue' : 'badge-gray'}`}>{y.status}</span>
                </div>
              </button>
            ))}
            {!years.length && <p className="px-4 py-8 text-center text-gray-400">No academic years</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">{selectedYear ? `Terms — ${selectedYear.year_name}` : 'Select a Year'}</h2>
            {selectedYear && <button onClick={() => setShowAddTerm(true)} className="btn-outline btn-sm gap-1"><PlusIcon className="w-3.5 h-3.5" />Add Term</button>}
          </div>
          {selectedYear ? (
            <div className="divide-y divide-gray-50">
              {terms.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold">{t.term_name}</p>
                    <p className="text-xs text-gray-500">{t.start_date} → {t.end_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.is_current ? <span className="badge-green badge">Current</span> : null}
                    <span className={`badge ${t.status === 'active' ? 'badge-blue' : 'badge-gray'}`}>{t.status}</span>
                  </div>
                </div>
              ))}
              {!terms.length && <p className="px-4 py-8 text-center text-gray-400">No terms configured</p>}
            </div>
          ) : <div className="p-8 text-center text-gray-400">Select an academic year</div>}
        </div>
      </div>

      <Modal open={showAddYear} onClose={() => setShowAddYear(false)} title="Add Academic Year">
        <form onSubmit={addYear} className="space-y-4">
          <div><label className="label">Year Name *</label><input className="input" required value={yearForm.year_name} onChange={e => setYearForm(f => ({ ...f, year_name: e.target.value }))} placeholder="e.g. 2025/2026" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date *</label><input type="date" className="input" required value={yearForm.start_date} onChange={e => setYearForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="label">End Date *</label><input type="date" className="input" required value={yearForm.end_date} onChange={e => setYearForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" checked={yearForm.is_current} onChange={e => setYearForm(f => ({ ...f, is_current: e.target.checked }))} /><span className="text-sm">Set as current year</span></label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddYear(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Create Year'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showAddTerm} onClose={() => setShowAddTerm(false)} title={`Add Term to ${selectedYear?.year_name}`}>
        <form onSubmit={addTerm} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Term Name *</label><input className="input" required value={termForm.term_name} onChange={e => setTermForm(f => ({ ...f, term_name: e.target.value }))} placeholder="e.g. First Term" /></div>
            <div><label className="label">Term Number</label><input type="number" min={1} max={3} className="input" value={termForm.term_number} onChange={e => setTermForm(f => ({ ...f, term_number: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input type="date" className="input" value={termForm.start_date} onChange={e => setTermForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="label">End Date</label><input type="date" className="input" value={termForm.end_date} onChange={e => setTermForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" checked={termForm.is_current} onChange={e => setTermForm(f => ({ ...f, is_current: e.target.checked }))} /><span className="text-sm">Set as current term</span></label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddTerm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Create Term'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
