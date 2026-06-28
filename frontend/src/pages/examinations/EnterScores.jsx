import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EnterScoresPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examData, setExamData] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    examAPI.getScores(id)
      .then(r => {
        setExamData(r.data.data);
        setScores(r.data.data.scores.map(s => ({
          student_id: s.student_id || s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          class_test: s.class_test || 0,
          assignment: s.assignment || 0,
          mid_term: s.mid_term || 0,
          end_of_term: s.end_of_term || 0,
          is_absent: s.is_absent || false,
          grade: s.grade || '',
          total: (parseFloat(s.class_test || 0) + parseFloat(s.assignment || 0) + parseFloat(s.mid_term || 0) + parseFloat(s.end_of_term || 0)),
        })));
      })
      .catch(() => toast.error('Failed to load exam'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateScore = (idx, field, value, maxVal) => {
    setScores(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      let parsed = field === 'is_absent' ? value : (parseFloat(value) || 0);
      if (typeof parsed === 'number' && maxVal !== undefined && parsed > maxVal) parsed = maxVal;
      const updated = { ...s, [field]: parsed };
      updated.total = parseFloat(updated.class_test || 0) + parseFloat(updated.assignment || 0) + parseFloat(updated.mid_term || 0) + parseFloat(updated.end_of_term || 0);
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await examAPI.saveScores(id, { scores });
      toast.success('Scores saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this examination? Scores will be locked.')) return;
    setApproving(true);
    try {
      await examAPI.approve(id);
      toast.success('Examination approved');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const gradeColor = (pct) => {
    if (pct >= 80) return 'text-green-700 bg-green-50';
    if (pct >= 60) return 'text-amber-700 bg-amber-50';
    if (pct >= 50) return 'text-orange-700 bg-orange-50';
    return 'text-red-700 bg-red-50';
  };

  if (loading) return <PageLoader />;
  if (!examData) return <p>Exam not found</p>;

  const { exam } = examData;
  const isPrivileged = user?.role === 'admin' || user?.role === 'headmaster' || user?.role === 'teacher';
  const isApproved = exam.status === 'approved';
  const isLocked = isApproved && !isPrivileged;
  const totalMax = parseFloat(exam.total_marks || 100);
  const compMax = {
    class_test:   parseFloat(exam.class_test_max  ?? 10),
    assignment:   parseFloat(exam.assignment_max  ?? 10),
    mid_term:     parseFloat(exam.mid_term_max    ?? 20),
    end_of_term:  parseFloat(exam.end_of_term_max ?? 60),
  };
  const passThreshold = totalMax * 0.5;
  const avgScore = scores.length ? scores.reduce((s, r) => s + r.total, 0) / scores.length : 0;
  const passCount = scores.filter(s => s.total >= passThreshold && !s.is_absent).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="btn-outline p-2 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{exam.exam_name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="badge-blue">{exam.class_name}</span>
            <span className="badge-purple">{exam.subject_name}</span>
            <span className="badge-gray">{exam.term_name} — {exam.year_name}</span>
            <span className={`badge ${isApproved ? 'badge-green' : exam.status === 'submitted' ? 'badge-yellow' : 'badge-gray'}`}>{exam.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : isApproved ? 'Update Scores' : 'Save Scores'}
            </button>
          )}
          {exam.status === 'submitted' && (user?.role === 'admin' || user?.role === 'headmaster') && (
            <button onClick={handleApprove} disabled={approving} className="btn-success gap-2">
              <CheckIcon className="w-4 h-4" />
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: scores.length },
          { label: 'Class Average', value: `${avgScore.toFixed(1)} / ${totalMax}` },
          { label: 'Passed (≥50%)', value: `${passCount} (${scores.length ? Math.round(passCount/scores.length*100) : 0}%)` },
          { label: 'Total Max Marks', value: `${totalMax}` },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Score entry table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900">Score Entry</h2>
          <div className="flex gap-4 text-xs text-gray-500">
            {Object.entries(compMax).map(([k, v]) => (
              <span key={k}>{k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}: <strong className="text-gray-700">{v}</strong></span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Class Test <span className="font-normal text-gray-400">/{compMax.class_test}</span></th>
                <th>Assignment <span className="font-normal text-gray-400">/{compMax.assignment}</span></th>
                <th>Mid Term <span className="font-normal text-gray-400">/{compMax.mid_term}</span></th>
                <th>End of Term <span className="font-normal text-gray-400">/{compMax.end_of_term}</span></th>
                <th>Total <span className="font-normal text-gray-400">/{totalMax}</span></th>
                <th>Grade</th>
                <th>Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scores.map((s, idx) => {
                const pct = totalMax > 0 ? (s.total / totalMax) * 100 : 0;
                return (
                  <tr key={idx} className={s.is_absent ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="text-xs text-gray-400">{idx + 1}</td>
                    <td>
                      <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.admission_number}</p>
                    </td>
                    {['class_test', 'assignment', 'mid_term', 'end_of_term'].map(field => (
                      <td key={field}>
                        <input
                          type="number" min="0" max={compMax[field]} step="0.5"
                          value={s[field]}
                          onChange={e => updateScore(idx, field, e.target.value, compMax[field])}
                          disabled={isLocked || s.is_absent}
                          className="input w-20 text-center py-1 text-sm"
                        />
                      </td>
                    ))}
                    <td>
                      <div className={`inline-block px-2 py-1 rounded-lg text-sm font-bold ${gradeColor(pct)}`}>
                        {s.total.toFixed(1)}
                        <span className="text-xs font-normal ml-1 opacity-70">({pct.toFixed(0)}%)</span>
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs font-bold ${gradeColor(pct)}`}>
                        {s.is_absent ? 'ABS' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={s.is_absent}
                        onChange={e => updateScore(idx, 'is_absent', e.target.checked)}
                        disabled={isLocked}
                        className="rounded border-gray-300 text-primary-600"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!isLocked && (
        <div className="flex justify-end gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : isApproved ? 'Update Scores' : 'Save All Scores'}
          </button>
        </div>
      )}
    </div>
  );
}
