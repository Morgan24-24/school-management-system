const bcrypt = require('bcryptjs');
const { query, queryOne, transaction } = require('../config/database');
const { generateStudentId, generateUsername, generatePassword, paginate, buildSearchQuery } = require('../utils/helpers');
const { create: notify } = require('./notificationsController');

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, class_id, status, academic_year_id } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (search) {
      const { clause, params: sp } = buildSearchQuery(search, [
        'u.first_name', 'u.last_name', 's.admission_number', 's.student_id_generated',
        'u.email', 'u.phone', 's.guardian_name', 's.guardian_phone'
      ]);
      if (clause) { conditions.push(clause); params.push(...sp); }
    }
    if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
    if (status) { conditions.push('s.status = ?'); params.push(status); }
    if (academic_year_id) { conditions.push('s.academic_year_id = ?'); params.push(academic_year_id); }

    const where = conditions.join(' AND ');

    const [students, [{ total }]] = await Promise.all([
      query(
        `SELECT s.id, s.admission_number, s.student_id_generated, s.gender,
                s.date_of_birth, s.class_id, s.status, s.admission_date,
                s.guardian_name, s.guardian_phone, s.guardian_email,
                u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
                c.class_name, c.stream, ay.year_name,
                p_u.first_name AS parent_first_name, p_u.last_name AS parent_last_name,
                p_u.phone AS parent_phone
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
         LEFT JOIN parents p ON s.parent_id = p.id
         LEFT JOIN users p_u ON p.user_id = p_u.id
         WHERE ${where}
         ORDER BY s.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) AS total FROM students s JOIN users u ON s.user_id = u.id WHERE ${where}`, params),
    ]);

    res.json({
      success: true,
      data: students,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const student = await queryOne(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo, u.username,
              c.class_name, c.stream, ay.year_name,
              p_u.first_name AS parent_first_name, p_u.last_name AS parent_last_name,
              p_u.phone AS parent_phone, p_u.email AS parent_email
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN users p_u ON p.user_id = p_u.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone, gender, date_of_birth,
      class_id, academic_year_id, parent_id, guardian_name, guardian_phone,
      guardian_email, guardian_relationship, address, admission_date,
      nationality, religion, blood_group, medical_notes, previous_school,
    } = req.body;

    if (!first_name || !last_name || !gender) {
      return res.status(400).json({ success: false, message: 'First name, last name, and gender are required' });
    }

    const studentId = generateStudentId('STU');
    const admission = req.body.admission_number || `ADM${Date.now().toString().slice(-7)}`;
    const username = generateUsername(first_name, last_name);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await transaction(async (conn) => {
      const [userResult] = await conn.execute(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, profile_photo)
         VALUES (?, ?, ?, 'student', ?, ?, ?, ?)`,
        [username, email || null, passwordHash, first_name, last_name, phone || null,
         req.file ? `/uploads/photos/${req.file.filename}` : null]
      );
      const userId = userResult.insertId;

      const [studentResult] = await conn.execute(
        `INSERT INTO students (user_id, admission_number, student_id_generated, gender, date_of_birth,
          class_id, academic_year_id, parent_id, guardian_name, guardian_phone, guardian_email,
          guardian_relationship, address, admission_date, nationality, religion, blood_group,
          medical_notes, previous_school)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, admission, studentId, gender, date_of_birth || null,
         class_id || null, academic_year_id || null, parent_id || null,
         guardian_name || null, guardian_phone || null, guardian_email || null,
         guardian_relationship || null, address || null, admission_date || null,
         nationality || 'Ghanaian', religion || null, blood_group || null,
         medical_notes || null, previous_school || null]
      );

      return { userId, studentId: studentResult.insertId, username, password, studentIdGenerated: studentId };
    });

    // Notify all admins and headmasters
    const admins = await query("SELECT id FROM users WHERE role IN ('admin','headmaster') AND is_active = 1");
    notify(admins.map(a => a.id), 'New Student Registered',
      `${first_name} ${last_name} (${result.username}) has been registered.`, 'student', result.studentId);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        id: result.studentId,
        studentId: result.studentIdGenerated,
        username: result.username,
        temporaryPassword: result.password,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await queryOne('SELECT user_id FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const b = req.body;
    const n = (v) => v ?? null;

    const first_name = n(b.first_name), last_name = n(b.last_name);
    const email = n(b.email), phone = n(b.phone);

    await transaction(async (conn) => {
      if (first_name || last_name || email || phone) {
        await conn.execute(
          `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
           email = COALESCE(?, email), phone = COALESCE(?, phone)
           ${req.file ? ', profile_photo = ?' : ''}
           WHERE id = ?`,
          req.file
            ? [first_name, last_name, email, phone, `/uploads/photos/${req.file.filename}`, student.user_id]
            : [first_name, last_name, email, phone, student.user_id]
        );
      }
      await conn.execute(
        `UPDATE students SET gender = COALESCE(?, gender), date_of_birth = COALESCE(?, date_of_birth),
         class_id = COALESCE(?, class_id), academic_year_id = COALESCE(?, academic_year_id),
         parent_id = COALESCE(?, parent_id), guardian_name = COALESCE(?, guardian_name),
         guardian_phone = COALESCE(?, guardian_phone), guardian_email = COALESCE(?, guardian_email),
         guardian_relationship = COALESCE(?, guardian_relationship), address = COALESCE(?, address),
         nationality = COALESCE(?, nationality), religion = COALESCE(?, religion),
         blood_group = COALESCE(?, blood_group), medical_notes = COALESCE(?, medical_notes),
         status = COALESCE(?, status) WHERE id = ?`,
        [n(b.gender), n(b.date_of_birth), n(b.class_id), n(b.academic_year_id), n(b.parent_id),
         n(b.guardian_name), n(b.guardian_phone), n(b.guardian_email), n(b.guardian_relationship),
         n(b.address), n(b.nationality), n(b.religion), n(b.blood_group), n(b.medical_notes),
         n(b.status), id]
      );
    });

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const student = await queryOne('SELECT user_id FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [student.user_id]);
    await query("UPDATE students SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const student = await queryOne('SELECT s.status, s.user_id FROM students s WHERE s.id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    await query('UPDATE students SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    await query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus === 'active' ? 1 : 0, student.user_id]);
    res.json({ success: true, message: `Student ${newStatus === 'active' ? 'activated' : 'deactivated'}`, data: { status: newStatus } });
  } catch (err) {
    next(err);
  }
};

exports.getFeeStatus = async (req, res, next) => {
  try {
    const { academic_year_id, term_id } = req.query;
    const student = await queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    let feeQuery = `
      SELECT fs.fee_type, fs.amount AS expected, fs.due_date,
             COALESCE(SUM(fp.amount_paid), 0) AS paid,
             (fs.amount - COALESCE(SUM(fp.amount_paid), 0)) AS balance
      FROM fee_structures fs
      LEFT JOIN fee_payments fp ON fp.student_id = ? AND fp.term_id = fs.term_id AND fp.academic_year_id = fs.academic_year_id
      WHERE fs.class_id = ?`;
    const params = [student.id, student.class_id];

    if (academic_year_id) { feeQuery += ' AND fs.academic_year_id = ?'; params.push(academic_year_id); }
    if (term_id) { feeQuery += ' AND fs.term_id = ?'; params.push(term_id); }
    feeQuery += ' GROUP BY fs.id ORDER BY fs.id';

    const fees = await query(feeQuery, params);
    const payments = await query(
      `SELECT fp.*, at.term_name, ay.year_name, u.first_name AS received_by_name
       FROM fee_payments fp
       JOIN academic_terms at ON fp.term_id = at.id
       JOIN academic_years ay ON fp.academic_year_id = ay.id
       LEFT JOIN users u ON fp.received_by = u.id
       WHERE fp.student_id = ? ORDER BY fp.payment_date DESC`,
      [student.id]
    );

    const totalExpected = fees.reduce((s, f) => s + parseFloat(f.expected), 0);
    const totalPaid = fees.reduce((s, f) => s + parseFloat(f.paid), 0);

    res.json({
      success: true,
      data: { fees, payments, summary: { totalExpected, totalPaid, totalBalance: totalExpected - totalPaid } },
    });
  } catch (err) {
    next(err);
  }
};

exports.promote = async (req, res, next) => {
  try {
    const { to_class_id, to_academic_year_id, status, remarks } = req.body;
    const student = await queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO student_promotions (student_id, from_class_id, to_class_id, from_academic_year_id, to_academic_year_id, promoted_by, remarks, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student.id, student.class_id, to_class_id, student.academic_year_id, to_academic_year_id, req.user.id, remarks, status || 'promoted']
      );
      await conn.execute(
        'UPDATE students SET class_id = ?, academic_year_id = ? WHERE id = ?',
        [to_class_id, to_academic_year_id, student.id]
      );
    });

    res.json({ success: true, message: 'Student promoted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.bulkImport = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file required' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        const first_name = row['First Name'] || row['first_name'];
        const last_name = row['Last Name'] || row['last_name'];
        const gender = (row['Gender'] || row['gender'] || '').toLowerCase();

        if (!first_name || !last_name || !gender) {
          results.failed++;
          results.errors.push(`Row skipped: missing required fields`);
          continue;
        }

        const username = generateUsername(first_name, last_name);
        const password = generatePassword();
        const hash = await bcrypt.hash(password, 12);
        const studentId = generateStudentId('STU');
        const admission = row['Admission Number'] || `ADM${Date.now().toString().slice(-7)}`;

        await transaction(async (conn) => {
          const [ur] = await conn.execute(
            `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone)
             VALUES (?, ?, ?, 'student', ?, ?, ?)`,
            [username, row['Email'] || null, hash, first_name, last_name, row['Phone'] || null]
          );
          await conn.execute(
            `INSERT INTO students (user_id, admission_number, student_id_generated, gender, date_of_birth, class_id, guardian_name, guardian_phone, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ur.insertId, admission, studentId, gender, row['Date of Birth'] || null,
             row['class_id'] || null, row['Guardian Name'] || null, row['Guardian Phone'] || null, row['Address'] || null]
          );
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(e.message);
      }
    }

    res.json({ success: true, message: `Import completed: ${results.success} added, ${results.failed} failed`, data: results });
  } catch (err) {
    next(err);
  }
};
