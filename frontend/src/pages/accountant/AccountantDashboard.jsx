import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import StatsCard from '../../components/common/StatsCard';
import { BanknotesIcon, CurrencyDollarIcon, CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function AccountantDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getAccountant().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p>Failed to load</p>;

  const { stats, todayPayments, paymentMethods } = data;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accountant Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={BanknotesIcon} label="Today's Collection" value={`GHS ${parseFloat(stats.today_collected || 0).toLocaleString()}`} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatsCard icon={CalendarDaysIcon} label="This Week" value={`GHS ${parseFloat(stats.week_collected || 0).toLocaleString()}`} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatsCard icon={CurrencyDollarIcon} label="This Month" value={`GHS ${parseFloat(stats.month_collected || 0).toLocaleString()}`} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatsCard icon={ChartBarIcon} label="This Year" value={`GHS ${parseFloat(stats.year_collected || 0).toLocaleString()}`} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header"><h2 className="text-sm font-semibold">Today's Payments</h2></div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Receipt</th><th>Student</th><th>Class</th><th>Method</th><th>Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(todayPayments || []).map((p, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{p.receipt_number}</td>
                    <td className="font-medium">{p.first_name} {p.last_name}</td>
                    <td>{p.class_name || '-'}</td>
                    <td className="capitalize text-xs">{p.payment_method?.replace('_', ' ')}</td>
                    <td className="font-bold text-green-700">GHS {parseFloat(p.amount_paid).toFixed(2)}</td>
                  </tr>
                ))}
                {!todayPayments?.length && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payments today</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">Payment Methods This Month</h2></div>
          <div className="p-4 space-y-3">
            {(paymentMethods || []).map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{m.payment_method?.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500">{m.count} transactions</p>
                </div>
                <p className="font-bold text-green-700">GHS {parseFloat(m.total).toFixed(2)}</p>
              </div>
            ))}
            {!paymentMethods?.length && <p className="text-center text-gray-400 py-4 text-sm">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
