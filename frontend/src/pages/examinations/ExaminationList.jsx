import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI, settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { PlusIcon, PencilSquareIcon, PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function ExaminationListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [form, setForm] = useState({ exam_name: '', exam_type: 'end_of_term', class_id: '', subject_id: '', academic_year_id: '', term_id: '', class_test_max: 10, assignment_max: 10, mid_term_max: 20, end_of_term_max: 60 });
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ class_id: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await examAPI.getAll(filters);
      setExams(data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([settingsAPI.getClasses(), settingsAPI.getSubjects(), settingsAPI.getAcademicYears()])
      .then(([c, s, y]) => { setClasses(c.data.data); setSubjects(s.data.data); setYears(y.data.data); });
  }, []);

  useEffect(() => {
    if (form.academic_year_id) {
      settingsAPI.getTerms({ academic_year_id: form.academic_year_id }).then(r => setTerms(r.data.data));
    }
  }, [form.academic_year_id]);

  const openEdit = (exam) => {
    setEditing(exam);
    setForm({
      exam_name: exam.exam_name,
      exam_type: exam.exam_type,
      class_id: exam.class_id,
      subject_id: exam.subject_id,
      academic_year_id: exam.academic_year_id,
      term_id: exam.term_id,
      class_test_max:   parseFloat(exam.class_test_max  ?? 10),
      assignment_max:   parseFloat(exam.assignment_max  ?? 10),
      mid_term_max:     parseFloat(exam.mid_term_max    ?? 20),
      end_of_term_max:  parseFloat(exam.end_of_term_max ?? 60),
    });
    setShowEdit(true);
  };

  const onEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await examAPI.update(editing.id, form);
      toast.success('Examination updated');
      setShowEdit(false);
      setEditing(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this examination? This will also remove all entered scores.')) return;
    try {
      await examAPI.remove(id);
      toast.success('Examination deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const onApprove = async (id) => {
    if (!confirm('Approve this examination? This cannot be undone.')) return;
    try {
      await examAPI.approve(id);
      toast.success('Examination approved');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await examAPI.create(form);
      toast.success('Examination created');
      setShowAdd(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const statusBadge = { draft: 'badge-gray', active: 'badge-blue', submitted: 'badge-yellow', approved: 'badge-green' };

  const columns = [
    { key: 'exam_name', header: 'Examination', render: (v, row) => (
      <div><p className="font-medium">{v}</p><p className="text-xs text-gray-400 capitalize">{row.exam_type?.replace('_',' ')}</p></div>
    )},
    { key: 'class_name', header: 'Class' },
    { key: 'subject_name', header: 'Subject' },
    { key: 'term_name', header: 'Term' },
    { key: 'status', header: 'Status', render: v => <span className={statusBadge[v] || 'badge-gray'}>{v}</span> },
    { key: 'total_marks', header: 'Max Marks' },
    { key: 'actions', header: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => navigate(`${user.role === 'teacher' ? '/teacher' : ''}/exams/${row.id}/scores`)} className="btn-outline btn-sm gap-1">
          <PencilSquareIcon className="w-3.5 h-3.5" />
          {row.status === 'approved' ? 'View' : 'Enter Scores'}
        </button>
        {(user.role === 'admin' || user.role === 'headmaster') && row.status === 'submitted' && (
          <button onClick={() => onApprove(row.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Approve">
            <CheckCircleIcon className="w-4 h-4" />
          </button>
        )}
        {row.status !== 'approved' && (
          <>
            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Edit">
              <PencilIcon className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Examinations</h1><p className="page-subtitle">Manage examination scores</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />New Exam</button>
      </div>

      <div className="flex gap-3">
        <select className="input w-40" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
        <select className="input w-40" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <DataTable columns={columns} data={exams} loading={loading} />

      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditing(null); }} title="Edit Examination">
        <form onSubmit={onEdit} className="space-y-4">
          <div><label className="label">Exam Name *</label><input className="input" value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} required>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} required>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Component Max Marks <span className="text-gray-400 font-normal">(must total 100)</span></label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {[['class_test_max','Class Test'],['assignment_max','Assignment'],['mid_term_max','Mid Term'],['end_of_term_max','End of Term']].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type="number" min="0" max="100" step="0.5" className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            {(() => { const t = (form.class_test_max||0)+(form.assignment_max||0)+(form.mid_term_max||0)+(form.end_of_term_max||0); return (
              <p className={`text-xs mt-2 font-medium ${t === 100 ? 'text-green-600' : 'text-red-500'}`}>Total: {t}/100 {t !== 100 ? '— must equal 100' : '✓'}</p>
            ); })()}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowEdit(false); setEditing(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Examination">
        <form onSubmit={onAdd} className="space-y-4">
          <div><label className="label">Exam Name *</label><input className="input" value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))} required /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}>
              {['class_test','assignment','mid_term','end_of_term','mock'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} required>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} required>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Academic Year *</label>
              <select className="input" value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} required>
                <option value="">Select year</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Term *</label>
              <select className="input" value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))} required>
                <option value="">Select term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Component Max Marks <span className="text-gray-400 font-normal">(must total 100)</span></label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {[['class_test_max','Class Test'],['assignment_max','Assignment'],['mid_term_max','Mid Term'],['end_of_term_max','End of Term']].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type="number" min="0" max="100" step="0.5" className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            {(() => { const t = (form.class_test_max||0)+(form.assignment_max||0)+(form.mid_term_max||0)+(form.end_of_term_max||0); return (
              <p className={`text-xs mt-2 font-medium ${t === 100 ? 'text-green-600' : 'text-red-500'}`}>Total: {t}/100 {t !== 100 ? '— must equal 100' : '✓'}</p>
            ); })()}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create Exam'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
