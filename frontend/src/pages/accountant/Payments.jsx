import { useEffect, useState, useCallback } from 'react';
import { feeAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function AccountantPayments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({});

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await feeAPI.getPayments({ page, limit: 20, search });
      setPayments(data.data);
      setPagination(data.pagination);
      setSummary(data.summary || {});
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const downloadReceipt = async (id) => {
    try {
      const { data } = await feeAPI.downloadReceipt(id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'receipt_number', header: 'Receipt', render: v => <span className="font-mono text-xs font-bold">{v}</span> },
    { key: 'first_name', header: 'Student', render: (_, r) => <div><p className="font-medium">{r.first_name} {r.last_name}</p><p className="text-xs text-gray-400">{r.admission_number}</p></div> },
    { key: 'class_name', header: 'Class', render: v => v || '-' },
    { key: 'term_name', header: 'Term' },
    { key: 'payment_method', header: 'Method', render: v => <span className="capitalize text-xs">{v?.replace('_', ' ')}</span> },
    { key: 'amount_paid', header: 'Amount', render: v => <span className="font-bold text-green-700">GHS {parseFloat(v).toFixed(2)}</span> },
    { key: 'payment_date', header: 'Date', render: v => <span className="text-xs">{format(new Date(v), 'dd/MM/yyyy')}</span> },
    { key: 'actions', header: '', render: (_, r) => <button onClick={() => downloadReceipt(r.id)} className="btn-outline btn-sm gap-1"><PrinterIcon className="w-3.5 h-3.5" />Print</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Payment History</h1><p className="page-subtitle">All fee payment transactions</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 bg-green-50 border-green-100"><p className="text-xs text-green-600 uppercase font-medium">Total Collected</p><p className="text-xl font-bold text-green-800">GHS {parseFloat(summary.totalCollected || 0).toFixed(2)}</p></div>
        <div className="card p-4 bg-blue-50 border-blue-100"><p className="text-xs text-blue-600 uppercase font-medium">Transactions</p><p className="text-xl font-bold text-blue-800">{summary.count || 0}</p></div>
      </div>
      <DataTable columns={columns} data={payments} loading={loading} pagination={pagination} onPageChange={load} searchValue={search} onSearch={setSearch} />
    </div>
  );
}
