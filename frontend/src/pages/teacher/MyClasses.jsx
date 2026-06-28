import { useEffect, useState } from 'react';
import { teacherAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MyClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherAPI.getMyClasses().then(r => setClasses(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">My Classes</h1><p className="page-subtitle">Classes and subjects assigned to you</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <div key={c.id} className="card p-5 hover:shadow-md transition">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold mb-3">{c.class_name?.[0]}</div>
            <h3 className="font-bold text-gray-900">{c.class_name} {c.stream || ''}</h3>
            <p className="text-sm text-gray-500 mt-1">{c.student_count || 0} students enrolled</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Subjects</p>
              <p className="text-sm text-gray-700">{c.subjects || 'None assigned'}</p>
            </div>
          </div>
        ))}
        {!classes.length && <div className="card p-12 text-center text-gray-400 col-span-full"><p>No classes assigned to you yet. Contact the administrator.</p></div>}
      </div>
    </div>
  );
}
