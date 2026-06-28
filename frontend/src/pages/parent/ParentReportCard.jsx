import { useEffect, useState } from 'react';
import { examAPI, settingsAPI, authAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function ParentReportCard() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({ academic_year_id: '', term_id: '' });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    authAPI.getProfile().then(async r => {
      const parentId = r.data.data?.profile?.id;
      if (!parentId) return;
      const { default: { parentAPI } } = await import('../../services/api');
      const { data } = await parentAPI.getChildren(parentId);
      setChildren(data.data);
      if (data.data.length > 0) setSelectedChild(data.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
    settingsAPI.getAcademicYears().then(r => setYears(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.academic_year_id) settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data));
  }, [filters.academic_year_id]);

  const download = async () => {
    if (!selectedChild || !filters.academic_year_id || !filters.term_id) {
      toast.error('Select child, year, and term'); return;
    }
    setDownloading(true);
    try {
      const { data } = await examAPI.downloadReportCard(selectedChild.id, filters);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${selectedChild.first_name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Report card not available. Results may not be published yet.'); }
    finally { setDownloading(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="page-header">
        <div><h1 className="page-title">Report Cards</h1><p className="page-subtitle">Download your child's report card</p></div>
      </div>

      <div className="card p-6 space-y-5">
        {children.length > 1 && (
          <div>
            <label className="label">Select Child</label>
            <select className="input" value={selectedChild?.id} onChange={e => setSelectedChild(children.find(c => c.id === parseInt(e.target.value)))}>
              {children.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
        )}
        {selectedChild && (
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">{selectedChild.first_name?.[0]}</div>
            <div><p className="font-semibold">{selectedChild.first_name} {selectedChild.last_name}</p><p className="text-sm text-blue-600">{selectedChild.class_name} • {selectedChild.admission_number}</p></div>
          </div>
        )}
        <div>
          <label className="label">Academic Year</label>
          <select className="input" value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value, term_id: '' }))}>
            <option value="">Select year</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Term</label>
          <select className="input" value={filters.term_id} onChange={e => setFilters(f => ({ ...f, term_id: e.target.value }))}>
            <option value="">Select term</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
          </select>
        </div>
        <button onClick={download} disabled={downloading} className="btn-primary w-full gap-2 py-3">
          <ArrowDownTrayIcon className="w-5 h-5" />
          {downloading ? 'Generating PDF...' : 'Download Report Card (PDF)'}
        </button>
        <p className="text-xs text-gray-400 text-center">Report cards are available after results are published by the school.</p>
      </div>
    </div>
  );
}
