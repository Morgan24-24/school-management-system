import { useEffect, useState, useCallback } from 'react';
import { settingsAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const EMPTY_FORM = { class_name: '', class_level: '', stream: '', class_teacher_id: '', capacity: 40 };

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        settingsAPI.getClasses(),
        import('../../services/api').then(m => m.teacherAPI.getAll({ limit: 100 })),
      ]);
      setClasses(c.data.data);
      setTeachers(t.data.data || []);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await settingsAPI.createClass(form);
      toast.success('Class created');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (cls) => {
    setEditing(cls);
    setEditForm({
      class_name: cls.class_name || '',
      class_level: cls.class_level || '',
      stream: cls.stream || '',
      class_teacher_id: cls.class_teacher_id || '',
      capacity: cls.capacity || 40,
      status: cls.status || 'active',
    });
    setShowEdit(true);
  };

  const onEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await settingsAPI.updateClass(editing.id, editForm);
      toast.success('Class updated');
      setShowEdit(false);
      setEditing(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!confirm('Deactivate this class?')) return;
    try { await settingsAPI.deleteClass(id); toast.success('Class deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'class_name', header: 'Class Name', render: v => <span className="font-semibold">{v}</span> },
    { key: 'class_level', header: 'Level', render: v => v || '-' },
    { key: 'stream', header: 'Stream', render: v => v || '-' },
    { key: 'teacher_first', header: 'Class Teacher', render: (_, r) => r.teacher_first ? `${r.teacher_first} ${r.teacher_last}` : '-' },
    { key: 'student_count', header: 'Students', render: v => <span className="badge-blue badge">{v || 0}</span> },
    { key: 'capacity', header: 'Capacity' },
    { key: 'status', header: 'Status', render: v => <span className={`badge ${v === 'active' ? 'badge-green' : 'badge-gray'}`}>{v}</span> },
    {
      key: 'actions', header: '', render: (_, r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  const ClassForm = ({ values, onChange, onSubmit, onCancel, isEdit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Class Name *</label>
          <input className="input" required value={values.class_name} onChange={e => onChange(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. JHS 1" />
        </div>
        <div>
          <label className="label">Level</label>
          <input className="input" value={values.class_level} onChange={e => onChange(f => ({ ...f, class_level: e.target.value }))} placeholder="e.g. Junior High" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Stream</label>
          <input className="input" value={values.stream} onChange={e => onChange(f => ({ ...f, stream: e.target.value }))} placeholder="e.g. A, Science" />
        </div>
        <div>
          <label className="label">Capacity</label>
          <input type="number" className="input" value={values.capacity} onChange={e => onChange(f => ({ ...f, capacity: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Class Teacher</label>
        <select className="input" value={values.class_teacher_id} onChange={e => onChange(f => ({ ...f, class_teacher_id: e.target.value }))}>
          <option value="">None</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
        </select>
      </div>
      {isEdit && (
        <div>
          <label className="label">Status</label>
          <select className="input" value={values.status} onChange={e => onChange(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Class')}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Classes</h1><p className="page-subtitle">Manage school classes and streams</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-4 h-4" />Add Class</button>
      </div>

      <DataTable columns={columns} data={classes} loading={loading} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Class">
        <ClassForm values={form} onChange={setForm} onSubmit={onAdd} onCancel={() => setShowAdd(false)} isEdit={false} />
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Class — ${editing?.class_name || ''}`}>
        <ClassForm values={editForm} onChange={setEditForm} onSubmit={onEdit} onCancel={() => setShowEdit(false)} isEdit={true} />
      </Modal>
    </div>
  );
}
