const { query, queryOne, transaction } = require('../config/database');
const { generateReceiptNumber, paginate, buildSearchQuery } = require('../utils/helpers');
const { generateReceiptPDF } = require('../services/pdfService');
const { sendFeeNotification } = require('../services/notificationService');
const { create: notify } = require('./notificationsController');

exports.getFeeStructures = async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.query;
    let conditions = ['1=1'], params = [];
    if (class_id) { conditions.push('fs.class_id = ?'); params.push(class_id); }
    if (academic_year_id) { conditions.push('fs.academic_year_id = ?'); params.push(academic_year_id); }
    if (term_id) { conditions.push('fs.term_id = ?'); params.push(term_id); }

    const structures = await query(
      `SELECT fs.*, c.class_name, at.term_name, ay.year_name
       FROM fee_structures fs
       JOIN classes c ON fs.class_id = c.id
       JOIN academic_terms at ON fs.term_id = at.id
       JOIN academic_years ay ON fs.academic_year_id = ay.id
       WHERE ${conditions.join(' AND ')} ORDER BY fs.class_id, fs.fee_type`,
      params
    );
    res.json({ success: true, data: structures });
  } catch (err) { next(err); }
};

exports.createFeeStructure = async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id, fee_type, amount, description, is_mandatory, due_date } = req.body;
    if (!class_id || !academic_year_id || !term_id || !fee_type || !amount) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    const result = await query(
      `INSERT INTO fee_structures (class_id, academic_year_id, term_id, fee_type, amount, description, is_mandatory, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [class_id, academic_year_id, term_id, fee_type, amount, description, is_mandatory !== false ? 1 : 0, due_date || null]
    );
    res.status(201).json({ success: true, message: 'Fee structure created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.updateFeeStructure = async (req, res, next) => {
  try {
    const { fee_type, amount, description, is_mandatory, due_date } = req.body;
    await query(
      `UPDATE fee_structures SET fee_type = COALESCE(?, fee_type), amount = COALESCE(?, amount),
       description = COALESCE(?, description), is_mandatory = COALESCE(?, is_mandatory),
       due_date = COALESCE(?, due_date) WHERE id = ?`,
      [fee_type, amount, description, is_mandatory, due_date, req.params.id]
    );
    res.json({ success: true, message: 'Fee structure updated' });
  } catch (err) { next(err); }
};

exports.deleteFeeStructure = async (req, res, next) => {
  try {
    await query('DELETE FROM fee_structures WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Fee structure deleted' });
  } catch (err) { next(err); }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const {
      student_id, academic_year_id, term_id, amount_paid,
      payment_date, payment_method, payment_reference, bank_name, notes,
    } = req.body;

    if (!student_id || !academic_year_id || !term_id || !amount_paid) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const student = await queryOne(
      `SELECT s.*, u.first_name, u.last_name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
      [student_id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const receiptNumber = generateReceiptNumber();

    const result = await query(
      `INSERT INTO fee_payments (receipt_number, student_id, academic_year_id, term_id, amount_paid,
        payment_date, payment_method, payment_reference, bank_name, received_by, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [receiptNumber, student_id, academic_year_id, term_id, amount_paid,
       payment_date || new Date().toISOString().slice(0, 10),
       payment_method || 'cash', payment_reference || null, bank_name || null,
       req.user.id, notes || null]
    );

    const payment = await queryOne(
      `SELECT fp.*, at.term_name, ay.year_name, u.first_name, u.last_name, s.admission_number,
              c.class_name, u2.first_name AS received_by_first, u2.last_name AS received_by_last
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_terms at ON fp.term_id = at.id
       JOIN academic_years ay ON fp.academic_year_id = ay.id
       LEFT JOIN users u2 ON fp.received_by = u2.id
       WHERE fp.id = ?`,
      [result.insertId]
    );

    sendFeeNotification(student, payment).catch(console.error);

    const admins = await query("SELECT id FROM users WHERE role IN ('admin','headmaster','accountant') AND is_active = 1");
    notify(admins.map(a => a.id), 'Fee Payment Received',
      `${student.first_name} ${student.last_name} paid GHS ${amount_paid} — Receipt: ${receiptNumber}`, 'payment', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { ...payment, receiptNumber },
    });
  } catch (err) { next(err); }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, student_id, class_id, academic_year_id, term_id, start_date, end_date } = req.query;

    let conditions = ['1=1'], params = [];
    if (search) {
      const { clause, params: sp } = buildSearchQuery(search, ['u.first_name', 'u.last_name', 's.admission_number', 'fp.receipt_number']);
      if (clause) { conditions.push(clause); params.push(...sp); }
    }
    if (student_id) { conditions.push('fp.student_id = ?'); params.push(student_id); }
    if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
    if (academic_year_id) { conditions.push('fp.academic_year_id = ?'); params.push(academic_year_id); }
    if (term_id) { conditions.push('fp.term_id = ?'); params.push(term_id); }
    if (start_date) { conditions.push('fp.payment_date >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('fp.payment_date <= ?'); params.push(end_date); }

    const where = conditions.join(' AND ');

    const [payments, [{ total }], [summary]] = await Promise.all([
      query(
        `SELECT fp.id, fp.receipt_number, fp.amount_paid, fp.payment_date, fp.payment_method,
                fp.status, u.first_name, u.last_name, s.admission_number, c.class_name,
                at.term_name, ay.year_name, u2.first_name AS received_by_first
         FROM fee_payments fp
         JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id
         LEFT JOIN classes c ON s.class_id = c.id
         JOIN academic_terms at ON fp.term_id = at.id
         JOIN academic_years ay ON fp.academic_year_id = ay.id
         LEFT JOIN users u2 ON fp.received_by = u2.id
         WHERE ${where} ORDER BY fp.payment_date DESC, fp.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) AS total FROM fee_payments fp
         JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id WHERE ${where}`,
        params
      ),
      query(
        `SELECT SUM(fp.amount_paid) AS total_collected, COUNT(*) AS count
         FROM fee_payments fp
         JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE ${where} AND fp.status = 'confirmed'`,
        params
      ),
    ]);

    res.json({
      success: true,
      data: payments,
      summary: { totalCollected: summary?.total_collected || 0, count: summary?.count || 0 },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

exports.getReceiptById = async (req, res, next) => {
  try {
    const payment = await queryOne(
      `SELECT fp.*, u.first_name, u.last_name, s.admission_number, c.class_name, s.guardian_name,
              at.term_name, ay.year_name, u2.first_name AS rb_first, u2.last_name AS rb_last,
              ss.school_name, ss.school_address, ss.school_phone
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       JOIN academic_terms at ON fp.term_id = at.id
       JOIN academic_years ay ON fp.academic_year_id = ay.id
       LEFT JOIN users u2 ON fp.received_by = u2.id
       CROSS JOIN school_settings ss
       WHERE fp.id = ?`,
      [req.params.id]
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

exports.downloadReceipt = async (req, res, next) => {
  try {
    const payment = await queryOne(
      `SELECT fp.*, u.first_name, u.last_name, s.admission_number, c.class_name, s.guardian_name,
              at.term_name, ay.year_name, u2.first_name AS rb_first, u2.last_name AS rb_last,
              ss.school_name, ss.school_address, ss.school_phone, ss.school_logo
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       JOIN academic_terms at ON fp.term_id = at.id
       JOIN academic_years ay ON fp.academic_year_id = ay.id
       LEFT JOIN users u2 ON fp.received_by = u2.id
       CROSS JOIN school_settings ss
       WHERE fp.id = ?`,
      [req.params.id]
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const pdfBuffer = await generateReceiptPDF(payment);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="receipt-${payment.receipt_number}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const { academic_year_id, term_id } = req.query;
    let yearCond = '', termCond = '', params = [];

    if (academic_year_id) { yearCond = ' AND fp.academic_year_id = ?'; params.push(academic_year_id); }
    if (term_id) { termCond = " AND fp.term_id = ?"; params.push(term_id); }

    const [[collected]] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM fee_payments fp WHERE status = 'confirmed'${yearCond}${termCond}`,
        params
      ),
    ]);

    const [monthly] = await query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month, SUM(amount_paid) AS total
       FROM fee_payments WHERE status = 'confirmed' AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month`,
      []
    );

    const [defaulters] = await query(
      `SELECT COUNT(DISTINCT s.id) AS count FROM students s
       LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.status = 'confirmed'
       WHERE s.status = 'active' GROUP BY s.id HAVING COALESCE(SUM(fp.amount_paid), 0) = 0`,
      []
    );

    res.json({
      success: true,
      data: { totalCollected: collected?.total || 0, monthly: monthly || [], defaulters: defaulters?.count || 0 },
    });
  } catch (err) { next(err); }
};

exports.getOutstandingFees = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { class_id, academic_year_id, term_id } = req.query;

    let conditions = ["s.status = 'active'"], params = [];
    if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }

    const students = await query(
      `SELECT s.id, u.first_name, u.last_name, s.admission_number, c.class_name,
              COALESCE(SUM(DISTINCT fs.amount), 0) AS total_expected,
              COALESCE(SUM(DISTINCT fp.amount_paid), 0) AS total_paid,
              (COALESCE(SUM(DISTINCT fs.amount), 0) - COALESCE(SUM(DISTINCT fp.amount_paid), 0)) AS balance
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN fee_structures fs ON fs.class_id = s.class_id
         ${academic_year_id ? 'AND fs.academic_year_id = ?' : ''}
         ${term_id ? 'AND fs.term_id = ?' : ''}
       LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.status = 'confirmed'
         ${academic_year_id ? 'AND fp.academic_year_id = ?' : ''}
         ${term_id ? 'AND fp.term_id = ?' : ''}
       WHERE ${conditions.join(' AND ')}
       GROUP BY s.id HAVING balance > 0
       ORDER BY balance DESC LIMIT ? OFFSET ?`,
      [
        ...(academic_year_id ? [academic_year_id] : []),
        ...(term_id ? [term_id] : []),
        ...(academic_year_id ? [academic_year_id] : []),
        ...(term_id ? [term_id] : []),
        ...params, limit, offset
      ]
    );

    res.json({ success: true, data: students });
  } catch (err) { next(err); }
};
