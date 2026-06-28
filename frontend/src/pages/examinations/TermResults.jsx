import { useEffect, useState } from 'react';
import { examAPI, settingsAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function TermResultsPage() {
  const [results, setResults] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', academic_year_id: '', term_id: '' });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    Promise.all([settingsAPI.getClasses(), settingsAPI.getAcademicYears()])
      .then(([c, y]) => { setClasses(c.data.data); setYears(y.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.academic_year_id) {
      settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data)).catch(() => {});
    }
  }, [filters.academic_year_id]);

  const loadResults = async () => {
    if (!filters.class_id || !filters.academic_year_id || !filters.term_id) {
      toast.error('Please select class, year, and term');
      return;
    }
    setLoading(true);
    try {
      const { data } = await examAPI.getTermResults(filters);
      setResults(data.data);
    } catch (err) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!filters.class_id || !filters.academic_year_id || !filters.term_id) return;
    setGenerating(true);
    try {
      const { data } = await examAPI.generateTermReport(filters);
      toast.success(data.message);
      loadResults();
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const publishResults = async () => {
    if (!confirm('Publish results? Parents will be notified.')) return;
    setPublishing(true);
    try {
      await examAPI.publishResults(filters);
      toast.success('Results published and parents notified');
      loadResults();
    } catch (err) {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const downloadCard = async (studentId) => {
    try {
      const { data } = await examAPI.downloadReportCard(studentId, {
        academic_year_id: filters.academic_year_id,
        term_id: filters.term_id,
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `report-card-${studentId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const gradeColor = (g) => ({ 'A+': 'badge-green', A: 'badge-green', B: 'badge-blue', C: 'badge-yellow', D: 'badge-yellow', F: 'badge-red' }[g] || 'badge-gray');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Term Results</h1>
          <p className="page-subtitle">View and manage end-of-term results</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Class</label>
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
          <div className="flex items-end gap-2">
            <button onClick={loadResults} disabled={loading} className="btn-primary flex-1">Load</button>
            <button onClick={generateReport} disabled={generating} className="btn-secondary">Generate</button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <>
          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{results.length} students</p>
            <div className="flex gap-2">
              <button onClick={publishResults} disabled={publishing} className="btn-success gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                {publishing ? 'Publishing...' : 'Publish & Notify Parents'}
              </button>
            </div>
          </div>

          {/* Results table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pos.</th>
                    <th>Student</th>
                    <th>Subjects</th>
                    <th>Total</th>
                    <th>Average</th>
                    <th>Grade</th>
                    <th>Position</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-gray-500">{r.position || idx + 1}</td>
                      <td>
                        <p className="font-medium">{r.student?.first_name} {r.student?.last_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.student?.admission_number}</p>
                      </td>
                      <td>{r.subjects?.length || 0}</td>
                      <td>{parseFloat(r.totalScore || 0).toFixed(1)}</td>
                      <td className="font-bold">{parseFloat(r.average || 0).toFixed(1)}%</td>
                      <td><span className={`badge ${gradeColor(r.overallGrade)}`}>{r.overallGrade}</span></td>
                      <td>{r.position || '-'} / {r.totalStudents || '-'}</td>
                      <td>
                        <button onClick={() => downloadCard(r.student?.id)} className="btn-outline btn-sm gap-1">
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          Report Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg font-medium">No results to display</p>
          <p className="text-sm mt-1">Select filters and click Load, or generate a term report</p>
        </div>
      )}
      {loading && <PageLoader />}
    </div>
  );
}
