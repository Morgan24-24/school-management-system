import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { AcademicCapIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStudent().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-red-500">Failed to load</p>;

  const { student, termResults, feeStatus, recentScores } = data;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Welcome, {student?.first_name}!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 bg-blue-50 border-blue-100">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><AcademicCapIcon className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase">Class</p>
            <p className="text-xl font-bold text-blue-900">{student?.class_name || '-'}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 bg-green-50 border-green-100">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><CurrencyDollarIcon className="w-6 h-6 text-green-600" /></div>
          <div>
            <p className="text-xs text-green-600 font-medium uppercase">Total Paid</p>
            <p className="text-xl font-bold text-green-900">GHS {parseFloat(feeStatus?.paid || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 bg-purple-50 border-purple-100">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><ChartBarIcon className="w-6 h-6 text-purple-600" /></div>
          <div>
            <p className="text-xs text-purple-600 font-medium uppercase">Admission No</p>
            <p className="text-xl font-bold text-purple-900 font-mono text-base">{student?.admission_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">Term Results History</h2></div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Term</th><th>Year</th><th>Average</th><th>Grade</th><th>Position</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(termResults || []).map(r => (
                  <tr key={r.id}>
                    <td>{r.term_name}</td>
                    <td>{r.year_name}</td>
                    <td className="font-bold">{parseFloat(r.average_marks || 0).toFixed(1)}%</td>
                    <td><span className="badge-blue badge">{r.overall_grade}</span></td>
                    <td>{r.position_in_class}/{r.total_students}</td>
                  </tr>
                ))}
                {!termResults?.length && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No results yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">Recent Scores</h2></div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Exam</th><th>Subject</th><th>Score</th><th>Grade</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(recentScores || []).map((s, i) => (
                  <tr key={i}>
                    <td className="text-xs">{s.exam_name}</td>
                    <td className="text-xs">{s.subject_name}</td>
                    <td className="font-bold">{parseFloat(s.total_score || 0).toFixed(1)}</td>
                    <td><span className="badge-blue badge text-xs">{s.grade}</span></td>
                  </tr>
                ))}
                {!recentScores?.length && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No recent scores</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
