import { useEffect, useState, useCallback } from 'react';
import { feeAPI, settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import { BellIcon } from '@heroicons/react/24/outline';

export default function OutstandingFeesPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ class_id: '', academic_year_id: '', term_id: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await feeAPI.getOutstanding(filters); setStudents(data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([settingsAPI.getClasses(), settingsAPI.getAcademicYears()])
      .then(([c, y]) => { setClasses(c.data.data); setYears(y.data.data); });
  }, []);
  useEffect(() => {
    if (filters.academic_year_id) settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data));
  }, [filters.academic_year_id]);

  const totalOutstanding = students.reduce((s, r) => s + parseFloat(r.balance || 0), 0);

  const columns = [
    { key: 'admission_number', header: 'Adm. No', render: v => <span className="font-mono text-xs">{v}</span> },
    { key: 'first_name', header: 'Student', render: (_, r) => <div><p className="font-medium">{r.first_name} {r.last_name}</p></div> },
    { key: 'class_name', header: 'Class', render: v => v || '-' },
    { key: 'total_expected', header: 'Expected', render: v => `GHS ${parseFloat(v || 0).toFixed(2)}` },
    { key: 'total_paid', header: 'Paid', render: v => <span className="text-green-700 font-medium">GHS {parseFloat(v || 0).toFixed(2)}</span> },
    { key: 'balance', header: 'Balance Owed', render: v => <span className="text-red-700 font-bold">GHS {parseFloat(v || 0).toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Outstanding Fees</h1><p className="page-subtitle">Students with unpaid fee balances</p></div>
      </div>

      {totalOutstanding > 0 && (
        <div className="card p-5 bg-red-50 border-red-200">
          <p className="text-xs text-red-600 uppercase font-medium">Total Outstanding Balance</p>
          <p className="text-3xl font-bold text-red-800 mt-1">GHS {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-sm text-red-600 mt-1">{students.length} students with outstanding fees</p>
        </div>
      )}

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

      <DataTable columns={columns} data={students} loading={loading} emptyText="No outstanding fees found — all students are up to date!" />
    </div>
  );
}
