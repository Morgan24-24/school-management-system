import { useEffect, useState, useCallback } from 'react';
import { teacherAPI, settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { PlusIcon, EyeIcon, TrashIcon, CheckCircleIcon, ClipboardDocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [selected, setSelected] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignForm, setAssignForm] = useState({ class_id: '', subject_id: '', academic_year_id: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    gender: '', qualification: '', specialization: '', employment_type: 'permanent',
  });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await teacherAPI.getAll({ page, limit: 20, search });
      setTeachers(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load teachers'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    settingsAPI.getClasses().then(r => setClasses(r.data.data)).catch(() => {});
    settingsAPI.getSubjects().then(r => setSubjects(r.data.data)).catch(() => {});
    settingsAPI.getAcademicYears().then(r => setAcademicYears(r.data.data)).catch(() => {});
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const { data } = await teacherAPI.create(fd);
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', gender: '', qualification: '', specialization: '', employment_type: 'permanent' });
      load(1);
      setCredentials({
        name: `${form.first_name} ${form.last_name}`,
        staffId: data.data.staffId,
        username: data.data.username,
        password: data.data.temporaryPassword,
      });
      setShowCredentials(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!confirm('Deactivate this teacher?')) return;
    try { await teacherAPI.remove(id); toast.success('Teacher deactivated'); load(pagination.page); }
    catch { toast.error('Failed'); }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));

  const openView = async (row) => {
    try {
      const { data } = await teacherAPI.getById(row.id);
      setSelected(data.data);
    } catch { setSelected(row); }
    setShowView(true);
  };

  const onAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.class_id || !assignForm.subject_id || !assignForm.academic_year_id) {
      return toast.error('Please fill all assignment fields');
    }
    setAssigning(true);
    try {
      await teacherAPI.assignSubject(selected.id, assignForm);
      toast.success('Subject assigned');
      const { data } = await teacherAPI.getById(selected.id);
      setSelected(data.data);
      setAssignForm({ class_id: '', subject_id: '', academic_year_id: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to assign'); }
    finally { setAssigning(false); }
  };

  const onRemoveAssignment = async (assignmentId) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await teacherAPI.removeAssignment(selected.id, assignmentId);
      toast.success('Assignment removed');
      const { data } = await teacherAPI.getById(selected.id);
      setSelected(data.data);
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'staff_id', header: 'Staff ID', render: v => <span className="font-mono text-xs text-gray-500">{v}</span> },
    { key: 'first_name', header: 'Name', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">{row.first_name?.[0]}{row.last_name?.[0]}</div>
        <div><p className="font-medium">{row.first_name} {row.last_name}</p><p className="text-xs text-gray-400">{row.email}</p></div>
      </div>
    )},
    { key: 'qualification', header: 'Qualification', render: v => v || '-' },
    { key: 'specialization', header: 'Specialization', render: v => v || '-' },
    { key: 'phone', header: 'Phone', render: v => <span className="text-xs">{v || '-'}</span> },
    { key: 'status', header: 'Status', render: v => <span className={`badge ${v === 'active' ? 'badge-green' : 'badge-gray'}`}>{v}</span> },
    { key: 'actions', header: '', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => openView(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><EyeIcon className="w-4 h-4" /></button>
        <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><TrashIcon className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const field = (label, key, type = 'text', options) => (
    <div key={key}>
      <label className="label">{label}</label>
      {options ? (
        <select className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={type} className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Teachers</h1><p className="page-subtitle">Manage teaching staff</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Teacher</button>
      </div>

      <DataTable columns={columns} data={teachers} loading={loading} pagination={pagination} onPageChange={load} searchValue={search} onSearch={setSearch} searchPlaceholder="Search teachers..." />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register Teacher" size="lg">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('First Name *', 'first_name')}
            {field('Last Name *', 'last_name')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Gender *', 'gender', 'text', [['', 'Select'], ['male', 'Male'], ['female', 'Female']])}
            {field('Phone', 'phone', 'tel')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Email', 'email', 'email')}
            {field('Qualification', 'qualification')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Specialization', 'specialization')}
            {field('Employment Type', 'employment_type', 'text', [['permanent', 'Permanent'], ['contract', 'Contract'], ['part_time', 'Part Time']])}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Register Teacher'}</button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal open={showCredentials} onClose={() => setShowCredentials(false)} title="Teacher Login Details">
        {credentials && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-800">{credentials.name} registered successfully!</p>
              <p className="text-sm text-green-600 mt-1">Share these login details with the teacher.</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Staff ID', value: credentials.staffId },
                { label: 'Username', value: credentials.username },
                { label: 'Temporary Password', value: credentials.password },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="font-mono font-semibold text-gray-900 mt-0.5">{value}</p>
                  </div>
                  <button onClick={() => copyToClipboard(value)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">The teacher should change their password after first login.</p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowCredentials(false)} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal open={showView} onClose={() => setShowView(false)} title="Teacher Details" size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xl font-bold">{selected.first_name?.[0]}{selected.last_name?.[0]}</div>
              <div>
                <h2 className="text-lg font-bold">{selected.first_name} {selected.last_name}</h2>
                <p className="text-gray-500 text-sm">{selected.staff_id}</p>
                <span className={`badge ${selected.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{selected.status}</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Email', selected.email], ['Phone', selected.phone], ['Gender', selected.gender],
                ['Qualification', selected.qualification], ['Specialization', selected.specialization],
                ['Employment Type', selected.employment_type]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">{l}</p>
                  <p className="font-medium">{v || '-'}</p>
                </div>
              ))}
            </div>

            {/* Login details */}
            {selected.username && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Login Details</p>
                <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-blue-500 uppercase tracking-wide">Username</p>
                    <p className="font-mono font-semibold text-blue-900 mt-0.5">{selected.username}</p>
                  </div>
                  <button onClick={() => copyToClipboard(selected.username)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Password is only shown once at registration.</p>
              </div>
            )}

            {/* Subject Assignments */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject Assignments</p>

              {/* Assign form */}
              <form onSubmit={onAssign} className="grid grid-cols-3 gap-2 mb-3">
                <select className="input text-sm" value={assignForm.class_id} onChange={e => setAssignForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.stream}</option>)}
                </select>
                <select className="input text-sm" value={assignForm.subject_id} onChange={e => setAssignForm(f => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
                <select className="input text-sm" value={assignForm.academic_year_id} onChange={e => setAssignForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                  <option value="">Year</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
                </select>
                <button type="submit" disabled={assigning} className="col-span-3 btn-primary text-sm py-1.5">
                  {assigning ? 'Assigning...' : '+ Assign Subject'}
                </button>
              </form>

              {/* Assignment list */}
              {selected.assignments?.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selected.assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{a.subject_name}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500">{a.class_name}</span>
                        <span className="text-gray-300 mx-1">·</span>
                        <span className="text-xs text-gray-400">{a.year_name}</span>
                      </div>
                      <button onClick={() => onRemoveAssignment(a.id)} className="p-1 text-gray-300 hover:text-red-500 rounded transition">
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">No subjects assigned yet</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
