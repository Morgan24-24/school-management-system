const { query, queryOne } = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await queryOne('SELECT * FROM school_settings LIMIT 1');
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const {
      school_name, school_motto, school_address, school_phone, school_email,
      school_website, school_type, headmaster_name, sms_enabled, email_enabled,
      whatsapp_enabled, twilio_account_sid, twilio_auth_token, twilio_phone_number,
      smtp_host, smtp_port, smtp_user, smtp_password, smtp_from,
      grading_system, fee_currency, timezone, date_format,
    } = req.body;

    const logoPath = req.file ? `/uploads/photos/${req.file.filename}` : undefined;

    await query(
      `UPDATE school_settings SET
       school_name = COALESCE(?, school_name),
       school_motto = COALESCE(?, school_motto),
       school_address = COALESCE(?, school_address),
       school_phone = COALESCE(?, school_phone),
       school_email = COALESCE(?, school_email),
       school_website = COALESCE(?, school_website),
       school_type = COALESCE(?, school_type),
       headmaster_name = COALESCE(?, headmaster_name),
       sms_enabled = COALESCE(?, sms_enabled),
       email_enabled = COALESCE(?, email_enabled),
       whatsapp_enabled = COALESCE(?, whatsapp_enabled),
       twilio_account_sid = COALESCE(?, twilio_account_sid),
       twilio_auth_token = COALESCE(?, twilio_auth_token),
       twilio_phone = COALESCE(?, twilio_phone),
       smtp_host = COALESCE(?, smtp_host),
       smtp_port = COALESCE(?, smtp_port),
       smtp_user = COALESCE(?, smtp_user),
       smtp_password = COALESCE(?, smtp_password),
       smtp_from = COALESCE(?, smtp_from),
       grading_system = COALESCE(?, grading_system),
       fee_currency = COALESCE(?, fee_currency),
       timezone = COALESCE(?, timezone),
       date_format = COALESCE(?, date_format)
       ${logoPath ? ', school_logo = ?' : ''}
       WHERE id = 1`,
      [school_name, school_motto, school_address, school_phone, school_email, school_website,
       school_type, headmaster_name, sms_enabled, email_enabled, whatsapp_enabled,
       twilio_account_sid, twilio_auth_token, twilio_phone_number,
       smtp_host, smtp_port, smtp_user, smtp_password, smtp_from,
       grading_system ? JSON.stringify(grading_system) : null,
       fee_currency, timezone, date_format,
       ...(logoPath ? [logoPath] : [])]
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) { next(err); }
};

exports.getAcademicYears = async (req, res, next) => {
  try {
    const years = await query('SELECT ay.*, (SELECT COUNT(*) FROM academic_terms WHERE academic_year_id = ay.id) AS term_count FROM academic_years ay ORDER BY ay.id DESC');
    res.json({ success: true, data: years });
  } catch (err) { next(err); }
};

exports.createAcademicYear = async (req, res, next) => {
  try {
    const { year_name, start_date, end_date, is_current } = req.body;
    if (is_current) await query('UPDATE academic_years SET is_current = 0');
    const result = await query(
      'INSERT INTO academic_years (year_name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
      [year_name, start_date, end_date, is_current ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Academic year created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.getTerms = async (req, res, next) => {
  try {
    const { academic_year_id } = req.query;
    let conditions = ['1=1'], params = [];
    if (academic_year_id) { conditions.push('at.academic_year_id = ?'); params.push(academic_year_id); }

    const terms = await query(
      `SELECT at.*, ay.year_name FROM academic_terms at
       JOIN academic_years ay ON at.academic_year_id = ay.id
       WHERE ${conditions.join(' AND ')} ORDER BY at.academic_year_id DESC, at.term_number`,
      params
    );
    res.json({ success: true, data: terms });
  } catch (err) { next(err); }
};

exports.createTerm = async (req, res, next) => {
  try {
    const { academic_year_id, term_name, term_number, start_date, end_date, is_current } = req.body;
    if (is_current) await query('UPDATE academic_terms SET is_current = 0');
    const result = await query(
      'INSERT INTO academic_terms (academic_year_id, term_name, term_number, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)',
      [academic_year_id, term_name, term_number, start_date, end_date, is_current ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Term created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.getClasses = async (req, res, next) => {
  try {
    const classes = await query(
      `SELECT c.*, u.first_name AS teacher_first, u.last_name AS teacher_last,
              COUNT(s.id) AS student_count
       FROM classes c
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
       GROUP BY c.id ORDER BY c.class_name`
    );
    res.json({ success: true, data: classes });
  } catch (err) { next(err); }
};

exports.createClass = async (req, res, next) => {
  try {
    const { class_name, class_level, stream, class_teacher_id, capacity, description } = req.body;
    if (!class_name) return res.status(400).json({ success: false, message: 'Class name required' });
    const result = await query(
      'INSERT INTO classes (class_name, class_level, stream, class_teacher_id, capacity, description) VALUES (?, ?, ?, ?, ?, ?)',
      [class_name, class_level || null, stream || null, class_teacher_id || null, capacity || 40, description || null]
    );
    res.status(201).json({ success: true, message: 'Class created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.updateClass = async (req, res, next) => {
  try {
    const { class_name, class_level, stream, class_teacher_id, capacity, description, status } = req.body;
    await query(
      `UPDATE classes SET class_name = COALESCE(?, class_name), class_level = COALESCE(?, class_level),
       stream = COALESCE(?, stream), class_teacher_id = COALESCE(?, class_teacher_id),
       capacity = COALESCE(?, capacity), description = COALESCE(?, description),
       status = COALESCE(?, status) WHERE id = ?`,
      [class_name, class_level, stream, class_teacher_id, capacity, description, status, req.params.id]
    );
    res.json({ success: true, message: 'Class updated' });
  } catch (err) { next(err); }
};

exports.deleteClass = async (req, res, next) => {
  try {
    await query("UPDATE classes SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Class deactivated' });
  } catch (err) { next(err); }
};

exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await query(
      `SELECT s.*,
              GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) ORDER BY u.first_name SEPARATOR ', ') AS teachers
       FROM subjects s
       LEFT JOIN teacher_subjects ts ON ts.subject_id = s.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE s.status = 'active'
       GROUP BY s.id
       ORDER BY s.subject_name`
    );
    res.json({ success: true, data: subjects });
  } catch (err) { next(err); }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { subject_name, subject_code, subject_type, description } = req.body;
    const result = await query(
      'INSERT INTO subjects (subject_name, subject_code, subject_type, description) VALUES (?, ?, ?, ?)',
      [subject_name, subject_code, subject_type || 'core', description || null]
    );
    res.status(201).json({ success: true, message: 'Subject created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { subject_name, subject_code, subject_type, description, status } = req.body;
    await query(
      `UPDATE subjects SET subject_name = COALESCE(?, subject_name), subject_code = COALESCE(?, subject_code),
       subject_type = COALESCE(?, subject_type), description = COALESCE(?, description),
       status = COALESCE(?, status) WHERE id = ?`,
      [subject_name, subject_code, subject_type, description, status, req.params.id]
    );
    res.json({ success: true, message: 'Subject updated' });
  } catch (err) { next(err); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = require('../utils/helpers').paginate(req.query.page, req.query.limit);
    const logs = await query(
      `SELECT al.*, u.first_name, u.last_name, u.role
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [{ total }] = await query('SELECT COUNT(*) AS total FROM audit_logs');
    res.json({ success: true, data: logs, pagination: { page, limit, total } });
  } catch (err) { next(err); }
};
