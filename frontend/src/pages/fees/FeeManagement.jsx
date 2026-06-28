import { useEffect, useState, useCallback } from 'react';
import { feeAPI, settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function FeeManagementPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalCollected: 0, count: 0 });
  const [search, setSearch] = useState('');
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({ academic_year_id: '', term_id: '', start_date: '', end_date: '' });

  useEffect(() => {
    settingsAPI.getAcademicYears().then(r => setYears(r.data.data));
  }, []);

  useEffect(() => {
    if (filters.academic_year_id) settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data));
  }, [filters.academic_year_id]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await feeAPI.getPayments({ page, limit: 20, search, ...filters });
      setPayments(data.data);
      setPagination(data.pagination);
      setSummary(data.summary || {});
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => { load(1); }, [load]);

  const downloadReceipt = async (id) => {
    try {
      const { data } = await feeAPI.downloadReceipt(id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const methodBadge = { cash: 'badge-green', bank_transfer: 'badge-blue', mobile_money: 'badge-purple', cheque: 'badge-yellow', card: 'badge-gray' };

  const columns = [
    { key: 'receipt_number', header: 'Receipt No', render: v => <span className="font-mono text-xs font-bold">{v}</span> },
    { key: 'first_name', header: 'Student', render: (_, r) => <div><p className="font-medium">{r.first_name} {r.last_name}</p><p className="text-xs text-gray-400 font-mono">{r.admission_number}</p></div> },
    { key: 'class_name', header: 'Class', render: v => v || '-' },
    { key: 'term_name', header: 'Term' },
    { key: 'payment_method', header: 'Method', render: v => <span className={`badge ${methodBadge[v] || 'badge-gray'} capitalize`}>{v?.replace('_', ' ')}</span> },
    { key: 'amount_paid', header: 'Amount', render: v => <span className="font-bold text-green-700">GHS {parseFloat(v).toFixed(2)}</span> },
    { key: 'payment_date', header: 'Date', render: v => <span className="text-xs text-gray-500">{format(new Date(v), 'dd/MM/yyyy')}</span> },
    { key: 'status', header: 'Status', render: v => <span className={`badge ${v === 'confirmed' ? 'badge-green' : 'badge-gray'}`}>{v}</span> },
    { key: 'actions', header: '', render: (_, r) => <button onClick={() => downloadReceipt(r.id)} className="btn-outline btn-sm gap-1"><PrinterIcon className="w-3.5 h-3.5" />Receipt</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Fee Payment History</h1><p className="page-subtitle">All recorded fee payments</p></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 bg-green-50 border-green-100">
          <p className="text-xs text-green-600 uppercase font-medium">Total Collected</p>
          <p className="text-2xl font-bold text-green-800">GHS {parseFloat(summary.totalCollected || 0).toLocaleString()}</p>
        </div>
        <div className="card p-5 bg-blue-50 border-blue-100">
          <p className="text-xs text-blue-600 uppercase font-medium">Transactions</p>
          <p className="text-2xl font-bold text-blue-800">{summary.count || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input w-44" value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value, term_id: '' }))}>
          <option value="">All Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
        </select>
        <select className="input w-44" value={filters.term_id} onChange={e => setFilters(f => ({ ...f, term_id: e.target.value }))}>
          <option value="">All Terms</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
        </select>
        <input type="date" className="input w-40" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
        <input type="date" className="input w-40" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
      </div>

      <DataTable columns={columns} data={payments} loading={loading} pagination={pagination} onPageChange={load} searchValue={search} onSearch={setSearch} searchPlaceholder="Search student or receipt..." />
    </div>
  );
}
