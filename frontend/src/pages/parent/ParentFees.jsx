import { useEffect, useState } from 'react';
import { studentAPI, authAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getProfile().then(async r => {
      const parentId = r.data.data?.profile?.id;
      if (!parentId) return;
      const { default: { parentAPI } } = await import('../../services/api');
      const { data } = await parentAPI.getChildren(parentId);
      setChildren(data.data);
      if (data.data.length > 0) setSelectedChild(data.data[0]);
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedChild) {
      studentAPI.getFeeStatus(selectedChild.id).then(r => setFeeStatus(r.data.data)).catch(() => {});
    }
  }, [selectedChild]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Fee Status</h1><p className="page-subtitle">View school fee payment history</p></div>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChild(c)} className={`btn ${selectedChild?.id === c.id ? 'btn-primary' : 'btn-outline'}`}>
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}

      {feeStatus && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 bg-blue-50 border-blue-100 text-center">
              <p className="text-xs text-blue-600 uppercase font-medium">Expected</p>
              <p className="text-xl font-bold text-blue-800">GHS {parseFloat(feeStatus.summary?.totalExpected || 0).toFixed(2)}</p>
            </div>
            <div className="card p-5 bg-green-50 border-green-100 text-center">
              <p className="text-xs text-green-600 uppercase font-medium">Paid</p>
              <p className="text-xl font-bold text-green-800">GHS {parseFloat(feeStatus.summary?.totalPaid || 0).toFixed(2)}</p>
            </div>
            <div className={`card p-5 border text-center ${feeStatus.summary?.totalBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-xs uppercase font-medium ${feeStatus.summary?.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>Balance</p>
              <p className={`text-xl font-bold ${feeStatus.summary?.totalBalance > 0 ? 'text-red-800' : 'text-green-800'}`}>GHS {parseFloat(feeStatus.summary?.totalBalance || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="text-sm font-semibold">Payment History</h2></div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Receipt</th><th>Amount</th><th>Method</th><th>Date</th><th>Term</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(feeStatus.payments || []).map((p, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{p.receipt_number}</td>
                      <td className="font-bold text-green-700">GHS {parseFloat(p.amount_paid).toFixed(2)}</td>
                      <td className="capitalize text-xs">{p.payment_method?.replace('_', ' ')}</td>
                      <td className="text-xs text-gray-500">{p.payment_date?.slice(0, 10)}</td>
                      <td className="text-xs">{p.term_name}</td>
                    </tr>
                  ))}
                  {!feeStatus.payments?.length && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payment records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
