import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import StatsCard from '../../components/common/StatsCard';
import { PageLoader } from '../../components/common/LoadingSpinner';
import {
  AcademicCapIcon, UsersIcon, CurrencyDollarIcon, ExclamationCircleIcon,
  BuildingLibraryIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getAdmin()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-red-500">Failed to load dashboard</p>;

  const { stats, recentPayments, recentStudents, charts } = data;

  const monthlyChart = {
    labels: (charts.monthlyFees || []).map(m => m.month),
    datasets: [{
      label: 'Fee Collection (GHS)',
      data: (charts.monthlyFees || []).map(m => parseFloat(m.collected || 0)),
      backgroundColor: 'rgba(59,130,246,0.15)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
    }],
  };

  const classChart = {
    labels: (charts.classPerformance || []).map(c => c.class_name),
    datasets: [{
      label: 'Avg Score',
      data: (charts.classPerformance || []).map(c => parseFloat(c.avg_score || 0).toFixed(1)),
      backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'],
    }],
  };

  const enrollChart = {
    labels: (charts.enrollmentByClass || []).map(c => c.class_name),
    datasets: [{
      data: (charts.enrollmentByClass || []).map(c => c.count),
      backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#a855f7','#14b8a6','#f43f5e'],
      borderWidth: 1,
    }],
  };

  const chartOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard icon={AcademicCapIcon} label="Total Students" value={stats.total_students?.toLocaleString()} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatsCard icon={UsersIcon} label="Teachers" value={stats.total_teachers?.toLocaleString()} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatsCard icon={BuildingLibraryIcon} label="Classes" value={stats.total_classes?.toLocaleString()} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatsCard icon={UserGroupIcon} label="Parents" value={stats.total_parents?.toLocaleString()} iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatsCard icon={CurrencyDollarIcon} label="Fees Collected" value={`GHS ${parseFloat(stats.fees_collected || 0).toLocaleString()}`} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatsCard icon={ExclamationCircleIcon} label="Outstanding" value={`GHS ${parseFloat(stats.fees_outstanding || 0).toLocaleString()}`} iconBg="bg-red-50" iconColor="text-red-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly fees line chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Monthly Fee Collection</h2>
          </div>
          <div className="card-body">
            <Line data={monthlyChart} options={{ ...chartOpts, plugins: { legend: { display: false } } }} height={120} />
          </div>
        </div>

        {/* Enrollment doughnut */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Enrollment by Class</h2>
          </div>
          <div className="card-body flex justify-center">
            <div style={{ maxWidth: 200 }}>
              <Doughnut data={enrollChart} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }} />
            </div>
          </div>
        </div>
      </div>

      {/* Class performance bar */}
      {(charts.classPerformance || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Class Performance (Average Scores)</h2>
          </div>
          <div className="card-body">
            <Bar data={classChart} options={chartOpts} height={80} />
          </div>
        </div>
      )}

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent payments */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(recentPayments || []).map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.first_name} {p.last_name}</td>
                    <td>{p.class_name || '-'}</td>
                    <td className="text-green-700 font-medium">GHS {parseFloat(p.amount_paid).toFixed(2)}</td>
                    <td className="text-gray-500 text-xs">{format(new Date(p.payment_date), 'dd/MM/yyyy')}</td>
                  </tr>
                ))}
                {!recentPayments?.length && (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-400">No recent payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent students */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Recently Enrolled Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(recentStudents || []).map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.first_name} {s.last_name}</td>
                    <td className="text-gray-500 text-xs font-mono">{s.admission_number}</td>
                    <td>{s.class_name || '-'}</td>
                    <td className="text-gray-500 text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy')}</td>
                  </tr>
                ))}
                {!recentStudents?.length && (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-400">No recent students</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
