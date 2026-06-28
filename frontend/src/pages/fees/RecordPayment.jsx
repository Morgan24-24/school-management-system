import { useEffect, useState } from 'react';
import { feeAPI, studentAPI, settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function RecordPaymentPage() {
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [years, setYears] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [form, setForm] = useState({
    student_id: '',
    academic_year_id: '',
    term_id: '',
    amount_paid: '',
    payment_method: 'cash',
    payment_reference: '',
    bank_name: '',
    notes: '',
    payment_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    settingsAPI.getAcademicYears().then(r => setYears(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.academic_year_id) {
      settingsAPI.getTerms({ academic_year_id: form.academic_year_id }).then(r => setTerms(r.data.data)).catch(() => {});
    }
  }, [form.academic_year_id]);

  useEffect(() => {
    if (studentSearch.length >= 2) {
      studentAPI.getAll({ search: studentSearch, limit: 10 }).then(r => setStudents(r.data.data)).catch(() => {});
    }
  }, [studentSearch]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setStudents([]);
    setStudentSearch(`${student.first_name} ${student.last_name} (${student.admission_number})`);
    setForm(f => ({ ...f, student_id: student.id }));

    if (form.academic_year_id && form.term_id) {
      loadFeeStatus(student.id);
    }
  };

  const loadFeeStatus = async (studentId) => {
    try {
      const { data } = await studentAPI.getFeeStatus(studentId || form.student_id, {
        academic_year_id: form.academic_year_id,
        term_id: form.term_id,
      });
      setFeeStatus(data.data);
    } catch {}
  };

  useEffect(() => {
    if (form.student_id && form.academic_year_id && form.term_id) {
      loadFeeStatus(form.student_id);
    }
  }, [form.academic_year_id, form.term_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.academic_year_id || !form.term_id || !form.amount_paid) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await feeAPI.recordPayment(form);
      setLastReceipt(data.data);
      toast.success(`Payment recorded! Receipt: ${data.data.receiptNumber}`);
      setForm(f => ({ ...f, amount_paid: '', payment_reference: '', notes: '' }));
      if (form.student_id) loadFeeStatus(form.student_id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async (id) => {
    try {
      const { data } = await feeAPI.downloadReceipt(id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${lastReceipt?.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Record Fee Payment</h1>
          <p className="page-subtitle">Record a new school fee payment</p>
        </div>
      </div>

      {/* Success receipt banner */}
      {lastReceipt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Payment Recorded Successfully!</p>
              <p className="text-sm text-green-700">Receipt No: <span className="font-mono font-bold">{lastReceipt.receipt_number}</span> | Amount: GHS {parseFloat(lastReceipt.amount_paid).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={() => downloadReceipt(lastReceipt.id)} className="btn-success btn-sm gap-2">
            <PrinterIcon className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment form */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Payment Details</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Student search */}
            <div className="relative">
              <label className="label">Student *</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name or admission number..."
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); setForm(f => ({ ...f, student_id: '' })); }}
              />
              {students.length > 0 && !selectedStudent && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {students.map(s => (
                    <button key={s.id} type="button" onClick={() => selectStudent(s)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition text-sm">
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="text-gray-400 ml-2 text-xs">({s.admission_number}) — {s.class_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Academic Year *</label>
                <select className="input" value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value, term_id: '' }))}>
                  <option value="">Select year</option>
                  {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Term *</label>
                <select className="input" value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))}>
                  <option value="">Select term</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount Paid (GHS) *</label>
                <input type="number" step="0.01" min="0" className="input" placeholder="0.00"
                  value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} />
              </div>
              <div>
                <label className="label">Payment Date *</label>
                <input type="date" className="input" value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="label">Reference / Receipt No</label>
                <input className="input" placeholder="Transaction reference"
                  value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))} />
              </div>
            </div>

            {['bank_transfer', 'cheque'].includes(form.payment_method) && (
              <div>
                <label className="label">Bank Name</label>
                <input className="input" placeholder="Bank name" value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
              </div>
            )}

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Additional notes..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              {submitting ? 'Processing...' : 'Record Payment'}
            </button>
          </form>
        </div>

        {/* Fee status sidebar */}
        <div className="space-y-4">
          {selectedStudent && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Student Info</h2>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Class</span><span className="font-medium">{selectedStudent.class_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Admission</span><span className="font-mono text-xs">{selectedStudent.admission_number}</span></div>
              </div>
            </div>
          )}

          {feeStatus && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Fee Status</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 uppercase tracking-wide">Total Expected</p>
                  <p className="text-xl font-bold text-blue-800">GHS {parseFloat(feeStatus.summary?.totalExpected || 0).toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 uppercase tracking-wide">Total Paid</p>
                  <p className="text-xl font-bold text-green-800">GHS {parseFloat(feeStatus.summary?.totalPaid || 0).toFixed(2)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${feeStatus.summary?.totalBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${feeStatus.summary?.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>Balance</p>
                  <p className={`text-xl font-bold ${feeStatus.summary?.totalBalance > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    GHS {parseFloat(feeStatus.summary?.totalBalance || 0).toFixed(2)}
                  </p>
                </div>

                {(feeStatus.fees || []).map((f, i) => (
                  <div key={i} className="border-b border-gray-100 pb-2 last:border-0 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{f.fee_type}</span>
                      <span className={parseFloat(f.balance) > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                        {parseFloat(f.balance) > 0 ? `GHS ${parseFloat(f.balance).toFixed(2)} owed` : '✓ Paid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
