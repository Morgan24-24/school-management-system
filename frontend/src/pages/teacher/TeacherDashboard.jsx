import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { PencilSquareIcon, BookOpenIcon } from '@heroicons/react/24/outline';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getTeacher().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-red-500">Failed to load</p>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Teacher Dashboard</h1><p className="page-subtitle">Manage your classes and enter examination scores</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-blue-50 border-blue-100 text-center">
          <p className="text-3xl font-bold text-blue-800">{data.myClasses?.length || 0}</p>
          <p className="text-sm text-blue-600 mt-1">My Classes</p>
        </div>
        <div className="card p-5 bg-green-50 border-green-100 text-center">
          <p className="text-3xl font-bold text-green-800">{data.pendingExams?.filter(e => e.status === 'draft').length || 0}</p>
          <p className="text-sm text-green-600 mt-1">Pending Exams</p>
        </div>
        <div className="card p-5 bg-purple-50 border-purple-100 text-center">
          <p className="text-3xl font-bold text-purple-800">{data.pendingExams?.filter(e => e.status === 'submitted').length || 0}</p>
          <p className="text-sm text-purple-600 mt-1">Awaiting Approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h2 className="text-sm font-semibold">My Classes</h2></div>
          <div className="divide-y divide-gray-50">
            {(data.myClasses || []).map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold">{c.class_name} {c.stream || ''}</p>
                  <p className="text-xs text-gray-500">{c.subject_count} subjects • {c.student_count} students</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.subjects}</p>
                </div>
                <BookOpenIcon className="w-5 h-5 text-gray-300" />
              </div>
            ))}
            {!data.myClasses?.length && <p className="px-4 py-6 text-center text-gray-400 text-sm">No classes assigned</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">Pending Examinations</h2>
            <button onClick={() => navigate('/teacher/exams')} className="btn-outline btn-sm">View All</button>
          </div>
          <div className="divide-y divide-gray-50">
            {(data.pendingExams || []).map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{e.exam_name}</p>
                  <p className="text-xs text-gray-500">{e.class_name} • {e.subject_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${e.status === 'draft' ? 'badge-gray' : 'badge-yellow'}`}>{e.status}</span>
                  <button onClick={() => navigate(`/teacher/exams/${e.id}/scores`)} className="p-1.5 hover:bg-primary-50 rounded text-primary-600"><PencilSquareIcon className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {!data.pendingExams?.length && <p className="px-4 py-6 text-center text-gray-400 text-sm">No pending examinations</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
