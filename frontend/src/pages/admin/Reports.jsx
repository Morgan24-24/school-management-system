import { useEffect, useState } from 'react';
import { reportAPI, settingsAPI } from '../../services/api';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('fee');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', academic_year_id: '', term_id: '', start_date: '', end_date: '' });
  const [feeReport, setFeeReport] = useState(null);
  const [subjectAnalysis, setSubjectAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([settingsAPI.getClasses(), settingsAPI.getAcademicYears()])
      .then(([c, y]) => { setClasses(c.data.data); setYears(y.data.data); });
  }, []);

  useEffect(() => {
    if (filters.academic_year_id) {
      settingsAPI.getTerms({ academic_year_id: filters.academic_year_id }).then(r => setTerms(r.data.data));
    }
  }, [filters.academic_year_id]);

  const loadFeeReport = async () => {
    setLoading(true);
    try {
      const { data } = await reportAPI.feeCollection(filters);
      setFeeReport(data.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const loadSubjectAnalysis = async () => {
    if (!filters.class_id || !filters.academic_year_id || !filters.term_id) { toast.error('Select class, year, and term'); return; }
    setLoading(true);
    try {
      const { data } = await reportAPI.subjectAnalysis(filters);
      setSubjectAnalysis(data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const exportFees = async () => {
    try {
      const { data } = await reportAPI.exportFeeCollection(filters);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'fee-collection.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const exportStudents = async () => {
    try {
      const { data } = await reportAPI.exportStudents(filters);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'students.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const subjectChart = {
    labels: subjectAnalysis.map(s => s.subject_name),
    datasets: [
      { label: 'Average Score', data: subjectAnalysis.map(s => parseFloat(s.avg_score || 0).toFixed(1)), backgroundColor: '#3b82f6' },
      { label: 'Pass Rate %', data: subjectAnalysis.map(s => s.students ? Math.round((s.passed / s.students) * 100) : 0), backgroundColor: '#10b981' },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Reports</h1><p className="page-subtitle">Generate and export school reports</p></div>
        <div className="flex gap-2">
          <button onClick={exportFees} className="btn-outline gap-2"><ArrowDownTrayIcon className="w-4 h-4" />Export Fees (Excel)</button>
          <button onClick={exportStudents} className="btn-outline gap-2"><ArrowDownTrayIcon className="w-4 h-4" />Export Students</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['fee', 'Fee Collection'], ['subject', 'Subject Analysis']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="label">Class</label>
            <select className="input" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Academic Year</label>
            <select className="input" value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value, term_id: '' }))}>
              <option value="">All Years</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Term</label>
            <select className="input" value={filters.term_id} onChange={e => setFilters(f => ({ ...f, term_id: e.target.value }))}>
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
            </select>
          </div>
          {activeTab === 'fee' && (
            <>
              <div><label className="label">From</label><input type="date" className="input" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><label className="label">To</label><input type="date" className="input" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} /></div>
            </>
          )}
          <div className="flex items-end">
            <button onClick={activeTab === 'fee' ? loadFeeReport : loadSubjectAnalysis} className="btn-primary w-full">Generate</button>
          </div>
        </div>
      </div>

      {loading && <PageLoader />}

      {activeTab === 'fee' && feeReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5 bg-green-50 border-green-100">
              <p className="text-xs text-green-600 uppercase font-medium">Total Collected</p>
              <p className="text-2xl font-bold text-green-800 mt-1">GHS {parseFloat(feeReport.summary?.total_collected || 0).toFixed(2)}</p>
            </div>
            <div className="card p-5 bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-600 uppercase font-medium">Transactions</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{feeReport.summary?.transactions || 0}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h2 className="text-sm font-semibold">Fee Collection Details</h2></div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Receipt No</th><th>Student</th><th>Class</th><th>Method</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(feeReport.payments || []).slice(0, 50).map((p, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{p.receipt_number}</td>
                      <td><p className="font-medium">{p.first_name} {p.last_name}</p><p className="text-xs text-gray-400 font-mono">{p.admission_number}</p></td>
                      <td>{p.class_name}</td>
                      <td className="capitalize text-xs">{p.payment_method?.replace('_', ' ')}</td>
                      <td className="font-bold text-green-700">GHS {parseFloat(p.amount_paid).toFixed(2)}</td>
                      <td className="text-xs text-gray-500">{p.payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subject' && subjectAnalysis.length > 0 && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header"><h2 className="text-sm font-semibold">Subject Performance Analysis</h2></div>
            <div className="card-body">
              <Bar data={subjectChart} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, max: 100 } } }} height={80} />
            </div>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Subject</th><th>Students</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Passed</th><th>Failed</th><th>Pass Rate</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectAnalysis.map((s, i) => (
                    <tr key={i}>
                      <td className="font-medium">{s.subject_name}</td>
                      <td>{s.students}</td>
                      <td className="font-bold">{parseFloat(s.avg_score || 0).toFixed(1)}</td>
                      <td className="text-green-700">{parseFloat(s.highest || 0).toFixed(1)}</td>
                      <td className="text-red-700">{parseFloat(s.lowest || 0).toFixed(1)}</td>
                      <td className="text-green-700 font-bold">{s.passed}</td>
                      <td className="text-red-700 font-bold">{s.failed}</td>
                      <td><span className={`badge ${s.students ? Math.round((s.passed/s.students)*100) >= 60 ? 'badge-green' : 'badge-red' : 'badge-gray'}`}>{s.students ? Math.round((s.passed/s.students)*100) : 0}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
