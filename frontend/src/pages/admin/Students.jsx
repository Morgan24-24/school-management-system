import { useEffect, useState, useCallback } from 'react';
import { studentAPI, settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon,
  ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const STATUS_BADGE = {
  active: 'badge-green', inactive: 'badge-gray',
  graduated: 'badge-blue', transferred: 'badge-yellow', suspended: 'badge-red',
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm();

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await studentAPI.getAll({ page, limit: 20, search, class_id: classFilter || undefined });
      setStudents(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [search, classFilter]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    settingsAPI.getClasses().then(r => setClasses(r.data.data)).catch(() => {});
  }, []);

  const openEdit = (student) => {
    setSelectedStudent(student);
    Object.keys(student).forEach(k => setValue(k, student[k]));
    setShowEdit(true);
  };

  const openView = (student) => { setSelectedStudent(student); setShowView(true); };

  const onAdd = async (formData) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (formData.photo?.[0]) fd.append('photo', formData.photo[0]);
      const { data } = await studentAPI.create(fd);
      setShowAdd(false);
      reset();
      load(1);
      setCredentials({
        name: `${formData.first_name} ${formData.last_name}`,
        username: data.data.username,
        password: data.data.temporaryPassword,
        studentId: data.data.studentId,
      });
      setShowCredentials(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add student'); }
    finally { setSubmitting(false); }
  };

  const onEdit = async (formData) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      await studentAPI.update(selectedStudent.id, fd);
      toast.success('Student updated');
      setShowEdit(false);
      load(pagination.page);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSubmitting(false); }
  };

  const onToggleStatus = async (student) => {
    const action = student.status === 'active' ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${student.first_name} ${student.last_name}?`)) return;
    try {
      const { data } = await studentAPI.toggleStatus(student.id);
      toast.success(data.message);
      load(pagination.page);
    } catch { toast.error('Failed to update status'); }
  };

  const onDelete = async (id) => {
    if (!confirm('Permanently deactivate this student?')) return;
    try {
      await studentAPI.remove(id);
      toast.success('Student deactivated');
      load(pagination.page);
    } catch { toast.error('Failed to deactivate'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { data } = await studentAPI.bulkImport(file);
      toast.success(data.message);
      load(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    e.target.value = '';
  };

  const columns = [
    { key: 'admission_number', header: 'Admission No', render: v => <span className="font-mono text-xs text-gray-500">{v}</span> },
    { key: 'first_name', header: 'Name', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
          {row.first_name?.[0]}{row.last_name?.[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-gray-400">{row.email || '-'}</p>
        </div>
      </div>
    )},
    { key: 'class_name', header: 'Class' },
    { key: 'gender', header: 'Gender', render: v => <span className="capitalize">{v}</span> },
    { key: 'guardian_name', header: 'Guardian' },
    { key: 'guardian_phone', header: 'Phone', render: v => <span className="text-xs">{v || '-'}</span> },
    { key: 'status', header: 'Status', render: v => <span className={`badge ${STATUS_BADGE[v] || 'badge-gray'}`}>{v}</span> },
    {
      key: 'actions', header: '', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openView(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View">
            <EyeIcon className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Edit">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(row)}
            className={`p-1.5 rounded-lg transition ${row.status === 'active' ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active' ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  const StudentForm = ({ onSubmit, loading: sub }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="form-row">
        <div><label className="label">First Name *</label><input {...register('first_name')} className="input" placeholder="First name" /></div>
        <div><label className="label">Last Name *</label><input {...register('last_name')} className="input" placeholder="Last name" /></div>
      </div>
      <div className="form-row">
        <div>
          <label className="label">Gender *</label>
          <select {...register('gender')} className="input">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div><label className="label">Date of Birth</label><input type="date" {...register('date_of_birth')} className="input" /></div>
      </div>
      <div className="form-row">
        <div>
          <label className="label">Class</label>
          <select {...register('class_id')} className="input">
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.stream}</option>)}
          </select>
        </div>
        <div><label className="label">Admission Number</label><input {...register('admission_number')} className="input" placeholder="Auto-generated if empty" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">Email</label><input type="email" {...register('email')} className="input" placeholder="student@email.com" /></div>
        <div><label className="label">Phone</label><input {...register('phone')} className="input" placeholder="0200000000" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">Guardian Name</label><input {...register('guardian_name')} className="input" /></div>
        <div><label className="label">Guardian Phone</label><input {...register('guardian_phone')} className="input" /></div>
      </div>
      <div><label className="label">Address</label><textarea {...register('address')} className="input" rows={2} /></div>
      <div><label className="label">Photo</label><input type="file" {...register('photo')} className="input" accept="image/*" /></div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => { setShowAdd(false); setShowEdit(false); reset(); }} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={sub} className="btn-primary">{sub ? 'Saving...' : 'Save Student'}</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Manage all student records</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-outline cursor-pointer text-xs">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} />
          </label>
          <button onClick={() => { reset(); setShowAdd(true); }} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input w-48">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        pagination={pagination}
        onPageChange={page => load(page)}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search students..."
      />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="Register New Student" size="lg">
        <StudentForm onSubmit={onAdd} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); reset(); }} title="Edit Student" size="lg">
        <StudentForm onSubmit={onEdit} loading={submitting} />
      </Modal>

      {/* Credentials Modal */}
      <Modal open={showCredentials} onClose={() => setShowCredentials(false)} title="Student Login Details">
        {credentials && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-800">{credentials.name} registered successfully!</p>
              <p className="text-sm text-green-600 mt-1">Share these login details with the student.</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Student ID', value: credentials.studentId },
                { label: 'Username', value: credentials.username },
                { label: 'Temporary Password', value: credentials.password },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="font-mono font-semibold text-gray-900 mt-0.5">{value}</p>
                  </div>
                  <button onClick={() => copyToClipboard(value)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Copy">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">The student should change their password after first login.</p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowCredentials(false)} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal open={showView} onClose={() => setShowView(false)} title="Student Details" size="lg">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xl font-bold">
                {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p className="text-gray-500 text-sm">{selectedStudent.admission_number}</p>
                <span className={`badge ${STATUS_BADGE[selectedStudent.status] || 'badge-gray'}`}>{selectedStudent.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Student ID', selectedStudent.student_id_generated],
                ['Class', selectedStudent.class_name],
                ['Gender', selectedStudent.gender],
                ['Date of Birth', selectedStudent.date_of_birth],
                ['Email', selectedStudent.email],
                ['Phone', selectedStudent.phone],
                ['Guardian', selectedStudent.guardian_name],
                ['Guardian Phone', selectedStudent.guardian_phone],
                ['Address', selectedStudent.address],
                ['Nationality', selectedStudent.nationality],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="font-medium mt-0.5">{val || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
