import { useEffect, useState } from 'react';
import { examAPI, studentAPI, settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PageLoader } from '../../components/common/LoadingSpinner';

export default function ReportCardsPage() {
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', academic_year_id: '', term_id: '' });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    Promise.all([settingsAPI.getAcademicYears(), settingsAPI.getClasses()])
      .then(([y, c]) => { setYears(y.data.data); setClasses(c.data.data); });
  }, []);

  useEffect(() => {
    if (filters.academic_year_id) {
      settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data));
    }
  }, [filters.academic_year_id]);

  const load = async () => {
    if (!filters.class_id) { toast.error('Select a class'); return; }
    setLoading(true);
    try {
      const { data } = await studentAPI.getAll({ class_id: filters.class_id, status: 'active', limit: 100 });
      setStudents(data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const download = async (studentId, name) => {
    if (!filters.academic_year_id || !filters.term_id) { toast.error('Select year and term'); return; }
    setDownloading(d => ({ ...d, [studentId]: true }));
    try {
      const { data } = await examAPI.downloadReportCard(studentId, { academic_year_id: filters.academic_year_id, term_id: filters.term_id });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `report-${name.replace(' ', '-')}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Report card not available. Generate term reports first.'); }
    finally { setDownloading(d => ({ ...d, [studentId]: false })); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Report Cards</h1><p className="page-subtitle">Download individual and class report cards</p></div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
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
          <div className="flex items-end">
            <button onClick={load} className="btn-primary w-full"><MagnifyingGlassIcon className="w-4 h-4" />Load Students</button>
          </div>
        </div>
      </div>

      {loading && <PageLoader />}

      {students.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">{students.length} Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="font-medium">{s.first_name} {s.last_name}</td>
                    <td className="font-mono text-xs text-gray-500">{s.admission_number}</td>
                    <td>
                      <button
                        onClick={() => download(s.id, `${s.first_name}-${s.last_name}`)}
                        disabled={downloading[s.id]}
                        className="btn-primary btn-sm gap-1"
                      >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        {downloading[s.id] ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
