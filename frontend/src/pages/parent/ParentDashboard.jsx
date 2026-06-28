import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { CurrencyDollarIcon, AcademicCapIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ParentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getParent().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-red-500">Failed to load</p>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Parent Dashboard</h1><p className="page-subtitle">Overview of your children's academic progress</p></div>
      </div>

      <div className="space-y-6">
        {(data.children || []).map(child => (
          <div key={child.id} className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                  {child.first_name?.[0]}{child.last_name?.[0]}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{child.first_name} {child.last_name}</h2>
                  <p className="text-sm text-gray-500">{child.class_name || 'No class'} • {child.admission_number}</p>
                </div>
              </div>
              <span className={`badge ${child.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{child.status}</span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Fee Status</span>
                </div>
                <p className="text-xs text-blue-600">Expected: GHS {parseFloat(child.feeStatus?.expected || 0).toFixed(2)}</p>
                <p className="text-xs text-blue-600">Paid: GHS {parseFloat(child.feeStatus?.paid || 0).toFixed(2)}</p>
                <p className={`text-sm font-bold mt-1 ${(child.feeStatus?.expected - child.feeStatus?.paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Balance: GHS {parseFloat((child.feeStatus?.expected || 0) - (child.feeStatus?.paid || 0)).toFixed(2)}
                </p>
              </div>
              {child.lastResult ? (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AcademicCapIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Last Results</span>
                  </div>
                  <p className="text-xs text-green-600">{child.lastResult.term_name} — {child.lastResult.year_name}</p>
                  <p className="text-2xl font-bold text-green-800 mt-1">{child.lastResult.overall_grade}</p>
                  <p className="text-xs text-green-600">Avg: {parseFloat(child.lastResult.average_marks || 0).toFixed(1)}% | Pos: {child.lastResult.position_in_class}/{child.lastResult.total_students}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-sm text-gray-400">No results yet</p>
                </div>
              )}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Quick Links</span>
                </div>
                <div className="space-y-1">
                  <a href="/parent/fees" className="block text-xs text-purple-700 hover:underline">→ View Fee History</a>
                  <a href="/parent/report-card" className="block text-xs text-purple-700 hover:underline">→ Download Report Card</a>
                  <a href="/parent/children" className="block text-xs text-purple-700 hover:underline">→ Child Profile</a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!data.children || data.children.length === 0) && (
          <div className="card p-12 text-center text-gray-400">
            <p>No children linked to your account. Contact the school administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
