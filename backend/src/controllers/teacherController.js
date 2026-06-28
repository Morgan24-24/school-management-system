const bcrypt = require('bcryptjs');
const { query, queryOne, transaction } = require('../config/database');
const { generateStaffId, generateUsername, generatePassword, paginate, buildSearchQuery } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, status } = req.query;
    let conditions = ['1=1'], params = [];

    if (search) {
      const { clause, params: sp } = buildSearchQuery(search, ['u.first_name', 'u.last_name', 't.staff_id', 'u.email', 'u.phone']);
      if (clause) { conditions.push(clause); params.push(...sp); }
    }
    if (status) { conditions.push('t.status = ?'); params.push(status); }

    const where = conditions.join(' AND ');
    const [teachers, [{ total }]] = await Promise.all([
      query(
        `SELECT t.id, t.staff_id, t.gender, t.qualification, t.specialization, t.employment_date,
                t.employment_type, t.status, u.first_name, u.last_name, u.email, u.phone, u.profile_photo
         FROM teachers t JOIN users u ON t.user_id = u.id
         WHERE ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) AS total FROM teachers t JOIN users u ON t.user_id = u.id WHERE ${where}`, params),
    ]);

    res.json({ success: true, data: teachers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const teacher = await queryOne(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo, u.username
       FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const assignments = await query(
      `SELECT ts.*, c.class_name, s.subject_name, ay.year_name
       FROM teacher_subjects ts
       JOIN classes c ON ts.class_id = c.id
       JOIN subjects s ON ts.subject_id = s.id
       JOIN academic_years ay ON ts.academic_year_id = ay.id
       WHERE ts.teacher_id = ? ORDER BY ay.id DESC`,
      [teacher.id]
    );

    res.json({ success: true, data: { ...teacher, assignments } });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone, gender, date_of_birth,
      qualification, specialization, employment_date, employment_type,
      address, salary, emergency_contact_name, emergency_contact_phone,
    } = req.body;

    if (!first_name || !last_name || !gender) {
      return res.status(400).json({ success: false, message: 'First name, last name, and gender are required' });
    }

    const staffId = generateStaffId('TCH');
    const username = generateUsername(first_name, last_name);
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 12);

    const result = await transaction(async (conn) => {
      const [ur] = await conn.execute(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, profile_photo)
         VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?)`,
        [username, email || null, hash, first_name, last_name, phone || null,
         req.file ? `/uploads/photos/${req.file.filename}` : null]
      );
      const [tr] = await conn.execute(
        `INSERT INTO teachers (user_id, staff_id, gender, date_of_birth, qualification, specialization,
          employment_date, employment_type, address, salary, emergency_contact_name, emergency_contact_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ur.insertId, staffId, gender, date_of_birth || null, qualification || null,
         specialization || null, employment_date || null, employment_type || 'permanent',
         address || null, salary || null, emergency_contact_name || null, emergency_contact_phone || null]
      );
      return { teacherId: tr.insertId, username, password, staffId };
    });

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      data: { id: result.teacherId, staffId: result.staffId, username: result.username, temporaryPassword: result.password },
    });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacher = await queryOne('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const { first_name, last_name, email, phone, gender, date_of_birth, qualification,
            specialization, employment_type, address, salary, status } = req.body;

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
         email = COALESCE(?, email), phone = COALESCE(?, phone)
         ${req.file ? ', profile_photo = ?' : ''} WHERE id = ?`,
        req.file
          ? [first_name, last_name, email, phone, `/uploads/photos/${req.file.filename}`, teacher.user_id]
          : [first_name, last_name, email, phone, teacher.user_id]
      );
      await conn.execute(
        `UPDATE teachers SET gender = COALESCE(?, gender), date_of_birth = COALESCE(?, date_of_birth),
         qualification = COALESCE(?, qualification), specialization = COALESCE(?, specialization),
         employment_type = COALESCE(?, employment_type), address = COALESCE(?, address),
         salary = COALESCE(?, salary), status = COALESCE(?, status) WHERE id = ?`,
        [gender, date_of_birth, qualification, specialization, employment_type, address, salary, status, id]
      );
    });

    res.json({ success: true, message: 'Teacher updated successfully' });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const teacher = await queryOne('SELECT user_id FROM teachers WHERE id = ?', [req.params.id]);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [teacher.user_id]);
    await query("UPDATE teachers SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Teacher deactivated' });
  } catch (err) { next(err); }
};

exports.assignSubject = async (req, res, next) => {
  try {
    const { class_id, subject_id, academic_year_id } = req.body;
    await query(
      `INSERT INTO teacher_subjects (teacher_id, class_id, subject_id, academic_year_id) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE teacher_id = teacher_id`,
      [req.params.id, class_id, subject_id, academic_year_id]
    );
    res.json({ success: true, message: 'Subject assigned to teacher' });
  } catch (err) { next(err); }
};

exports.removeSubjectAssignment = async (req, res, next) => {
  try {
    await query('DELETE FROM teacher_subjects WHERE id = ?', [req.params.assignmentId]);
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) { next(err); }
};

exports.getMyClasses = async (req, res, next) => {
  try {
    const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

    const classes = await query(
      `SELECT DISTINCT c.id, c.class_name, c.stream,
              GROUP_CONCAT(s.subject_name ORDER BY s.subject_name SEPARATOR ', ') AS subjects,
              COUNT(DISTINCT st.id) AS student_count
       FROM teacher_subjects ts
       JOIN classes c ON ts.class_id = c.id
       JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN students st ON st.class_id = c.id AND st.status = 'active'
       WHERE ts.teacher_id = ?
       GROUP BY c.id, c.class_name, c.stream`,
      [teacher.id]
    );

    res.json({ success: true, data: classes });
  } catch (err) { next(err); }
};
