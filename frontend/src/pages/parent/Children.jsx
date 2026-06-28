import { useEffect, useState } from 'react';
import { parentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ChildrenPage() {
  const { user } = useAuth();
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: profileData } = await import('../../services/api').then(m => m.authAPI.getProfile());
        const parentId = profileData.data?.profile?.id;
        if (!parentId) return;
        setParent(profileData.data.profile);
        const { data } = await parentAPI.getChildren(parentId);
        setChildren(data.data);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">My Children</h1><p className="page-subtitle">View your children's profiles</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {children.map(child => (
          <div key={child.id} className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xl font-bold">{child.first_name?.[0]}{child.last_name?.[0]}</div>
              <div>
                <h2 className="font-bold text-lg">{child.first_name} {child.last_name}</h2>
                <p className="text-gray-500 text-sm">{child.class_name || 'No class'} • {child.admission_number}</p>
                <span className={`badge ${child.status === 'active' ? 'badge-green' : 'badge-gray'} mt-1`}>{child.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[['Gender', child.gender], ['Date of Birth', child.date_of_birth], ['Email', child.email], ['Nationality', child.nationality]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">{l}</p><p className="font-medium capitalize">{v || '-'}</p></div>
              ))}
            </div>
          </div>
        ))}
        {!children.length && <div className="card p-12 text-center text-gray-400 col-span-full"><p>No children linked to your account.</p></div>}
      </div>
    </div>
  );
}
