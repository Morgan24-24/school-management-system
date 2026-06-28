const { query, queryOne, transaction } = require('../config/database');
const { getGrade, getPerformanceRemark } = require('../utils/grading');
const { generateReportCardPDF } = require('../services/pdfService');
const { sendResultsNotification } = require('../services/notificationService');

exports.getExaminations = async (req, res, next) => {
  try {
    const { class_id, subject_id, academic_year_id, term_id, teacher_id, status } = req.query;
    let conditions = ['1=1'], params = [];

    if (class_id) { conditions.push('e.class_id = ?'); params.push(class_id); }
    if (subject_id) { conditions.push('e.subject_id = ?'); params.push(subject_id); }
    if (academic_year_id) { conditions.push('e.academic_year_id = ?'); params.push(academic_year_id); }
    if (term_id) { conditions.push('e.term_id = ?'); params.push(term_id); }
    if (teacher_id) { conditions.push('e.teacher_id = ?'); params.push(teacher_id); }
    if (status) { conditions.push('e.status = ?'); params.push(status); }

    // Teachers only see their own exams
    if (req.user.role === 'teacher') {
      const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher) { conditions.push('e.teacher_id = ?'); params.push(teacher.id); }
    }

    const exams = await query(
      `SELECT e.*, c.class_name, s.subject_name, at.term_name, ay.year_name,
              u.first_name AS teacher_first, u.last_name AS teacher_last
       FROM examinations e
       JOIN classes c ON e.class_id = c.id
       JOIN subjects s ON e.subject_id = s.id
       JOIN academic_terms at ON e.term_id = at.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       LEFT JOIN teachers t ON e.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ${conditions.join(' AND ')} ORDER BY e.id DESC`,
      params
    );
    res.json({ success: true, data: exams });
  } catch (err) { next(err); }
};

exports.createExamination = async (req, res, next) => {
  try {
    const { exam_name, exam_type, class_id, subject_id, academic_year_id, term_id, exam_date, weight_percentage,
            class_test_max, assignment_max, mid_term_max, end_of_term_max } = req.body;
    if (!exam_name || !exam_type || !class_id || !subject_id || !academic_year_id || !term_id) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const ctMax  = parseFloat(class_test_max  || 10);
    const asMax  = parseFloat(assignment_max  || 10);
    const mtMax  = parseFloat(mid_term_max    || 20);
    const eotMax = parseFloat(end_of_term_max || 60);
    const total_marks = ctMax + asMax + mtMax + eotMax;

    if (Math.round(total_marks) !== 100) {
      return res.status(400).json({ success: false, message: `Component marks must sum to 100 (currently ${total_marks})` });
    }

    let teacher_id = req.body.teacher_id;
    if (req.user.role === 'teacher') {
      const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      teacher_id = teacher?.id;
    }

    const result = await query(
      `INSERT INTO examinations (exam_name, exam_type, class_id, subject_id, academic_year_id, term_id, teacher_id,
        exam_date, total_marks, weight_percentage, class_test_max, assignment_max, mid_term_max, end_of_term_max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exam_name, exam_type, class_id, subject_id, academic_year_id, term_id, teacher_id || null,
       exam_date || null, total_marks, weight_percentage || 100, ctMax, asMax, mtMax, eotMax]
    );
    res.status(201).json({ success: true, message: 'Examination created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

exports.updateExamination = async (req, res, next) => {
  try {
    const exam = await queryOne('SELECT * FROM examinations WHERE id = ?', [req.params.exam_id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
    if (exam.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot edit an approved examination' });

    if (req.user.role === 'teacher') {
      const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (exam.teacher_id !== teacher?.id) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { exam_name, exam_type, class_id, subject_id, academic_year_id, term_id, exam_date,
            class_test_max, assignment_max, mid_term_max, end_of_term_max } = req.body;

    let total_marks = null;
    if (class_test_max !== undefined || assignment_max !== undefined || mid_term_max !== undefined || end_of_term_max !== undefined) {
      const current = await queryOne('SELECT class_test_max, assignment_max, mid_term_max, end_of_term_max FROM examinations WHERE id = ?', [req.params.exam_id]);
      const ctMax  = parseFloat(class_test_max  ?? current.class_test_max);
      const asMax  = parseFloat(assignment_max  ?? current.assignment_max);
      const mtMax  = parseFloat(mid_term_max    ?? current.mid_term_max);
      const eotMax = parseFloat(end_of_term_max ?? current.end_of_term_max);
      total_marks = ctMax + asMax + mtMax + eotMax;
      if (Math.round(total_marks) !== 100) {
        return res.status(400).json({ success: false, message: `Component marks must sum to 100 (currently ${total_marks})` });
      }
    }

    await query(
      `UPDATE examinations SET
        exam_name = COALESCE(?, exam_name), exam_type = COALESCE(?, exam_type),
        class_id = COALESCE(?, class_id), subject_id = COALESCE(?, subject_id),
        academic_year_id = COALESCE(?, academic_year_id), term_id = COALESCE(?, term_id),
        exam_date = COALESCE(?, exam_date), total_marks = COALESCE(?, total_marks),
        class_test_max = COALESCE(?, class_test_max), assignment_max = COALESCE(?, assignment_max),
        mid_term_max = COALESCE(?, mid_term_max), end_of_term_max = COALESCE(?, end_of_term_max)
       WHERE id = ?`,
      [exam_name ?? null, exam_type ?? null, class_id ?? null, subject_id ?? null,
       academic_year_id ?? null, term_id ?? null, exam_date ?? null, total_marks ?? null,
       class_test_max ?? null, assignment_max ?? null, mid_term_max ?? null, end_of_term_max ?? null,
       req.params.exam_id]
    );
    res.json({ success: true, message: 'Examination updated' });
  } catch (err) { next(err); }
};

exports.deleteExamination = async (req, res, next) => {
  try {
    const exam = await queryOne('SELECT * FROM examinations WHERE id = ?', [req.params.exam_id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
    if (exam.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot delete an approved examination' });

    if (req.user.role === 'teacher') {
      const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (exam.teacher_id !== teacher?.id) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await query('DELETE FROM student_scores WHERE exam_id = ?', [req.params.exam_id]);
    await query('DELETE FROM examinations WHERE id = ?', [req.params.exam_id]);
    res.json({ success: true, message: 'Examination deleted' });
  } catch (err) { next(err); }
};

exports.getScores = async (req, res, next) => {
  try {
    const { exam_id } = req.params;
    const exam = await queryOne('SELECT * FROM examinations WHERE id = ?', [exam_id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    const scores = await query(
      `SELECT ss.*, u.first_name, u.last_name, st.admission_number, st.id AS student_id
       FROM students st
       JOIN users u ON st.user_id = u.id
       LEFT JOIN student_scores ss ON ss.student_id = st.id AND ss.examination_id = ?
       WHERE st.class_id = ? AND st.status = 'active'
       ORDER BY u.last_name, u.first_name`,
      [exam_id, exam.class_id]
    );
    res.json({ success: true, data: { exam, scores } });
  } catch (err) { next(err); }
};

exports.saveScores = async (req, res, next) => {
  try {
    const { exam_id } = req.params;
    const { scores } = req.body; // Array of { student_id, class_test, assignment, mid_term, end_of_term, is_absent }

    if (!Array.isArray(scores)) return res.status(400).json({ success: false, message: 'Scores must be an array' });

    const exam = await queryOne('SELECT * FROM examinations WHERE id = ?', [exam_id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const isPrivileged = ['admin', 'headmaster'].includes(req.user.role);
    const isTeacher = req.user.role === 'teacher';

    const settings = await queryOne('SELECT grading_system FROM school_settings LIMIT 1');
    const gradingSystem = settings?.grading_system ? JSON.parse(settings.grading_system) : null;

    await transaction(async (conn) => {
      for (const score of scores) {
        const ct = parseFloat(score.class_test) || 0;
        const asn = parseFloat(score.assignment) || 0;
        const mt = parseFloat(score.mid_term) || 0;
        const eot = parseFloat(score.end_of_term) || 0;
        const total = ct + asn + mt + eot;
        const { grade, remarks } = getGrade(total, gradingSystem);

        await conn.execute(
          `INSERT INTO student_scores (student_id, examination_id, class_test, assignment, mid_term, end_of_term, grade, remarks, is_absent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE class_test = ?, assignment = ?, mid_term = ?, end_of_term = ?, grade = ?, remarks = ?, is_absent = ?`,
          [score.student_id, exam_id, ct, asn, mt, eot, grade, remarks, score.is_absent ? 1 : 0,
           ct, asn, mt, eot, grade, remarks, score.is_absent ? 1 : 0]
        );
      }
      if (exam.status === 'approved' && isTeacher) {
        // Teacher edited an approved exam — send back for headmaster re-review
        await conn.execute("UPDATE examinations SET status = 'submitted' WHERE id = ?", [exam_id]);
      } else if (exam.status !== 'approved') {
        await conn.execute("UPDATE examinations SET status = 'submitted' WHERE id = ?", [exam_id]);
      }
    });

    res.json({ success: true, message: 'Scores saved successfully' });
  } catch (err) { next(err); }
};

exports.approveExamination = async (req, res, next) => {
  try {
    const { exam_id } = req.params;
    await query("UPDATE examinations SET status = 'approved' WHERE id = ?", [exam_id]);
    res.json({ success: true, message: 'Examination approved' });
  } catch (err) { next(err); }
};

exports.getTermResults = async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.query;
    if (!class_id || !academic_year_id || !term_id) {
      return res.status(400).json({ success: false, message: 'class_id, academic_year_id, term_id required' });
    }

    const students = await query(
      `SELECT st.id, u.first_name, u.last_name, st.admission_number
       FROM students st JOIN users u ON st.user_id = u.id
       WHERE st.class_id = ? AND st.status = 'active' ORDER BY u.last_name, u.first_name`,
      [class_id]
    );

    const settings = await queryOne('SELECT grading_system FROM school_settings LIMIT 1');
    const gradingSystem = settings?.grading_system ? JSON.parse(settings.grading_system) : null;

    const results = [];
    for (const student of students) {
      const subjectScores = await query(
        `SELECT s.subject_name, s.subject_code, ss.class_test, ss.assignment, ss.mid_term,
                ss.end_of_term, ss.total_score, ss.grade, ss.remarks, ss.is_absent, e.exam_name, e.exam_type
         FROM student_scores ss
         JOIN examinations e ON ss.examination_id = e.id
         JOIN subjects s ON e.subject_id = s.id
         WHERE ss.student_id = ? AND e.class_id = ? AND e.academic_year_id = ? AND e.term_id = ? AND e.status = 'approved'
         ORDER BY s.subject_name`,
        [student.id, class_id, academic_year_id, term_id]
      );

      const totalScore = subjectScores.reduce((sum, s) => sum + parseFloat(s.total_score || 0), 0);
      const average = subjectScores.length ? totalScore / subjectScores.length : 0;
      const { grade: overallGrade } = getGrade(average, gradingSystem);

      const existing = await queryOne(
        'SELECT * FROM term_results WHERE student_id = ? AND academic_year_id = ? AND term_id = ?',
        [student.id, academic_year_id, term_id]
      );

      results.push({
        student,
        subjects: subjectScores,
        totalScore: Math.round(totalScore * 100) / 100,
        average: Math.round(average * 100) / 100,
        overallGrade,
        remarks: getPerformanceRemark(average),
        headmasterRemarks: existing?.headmaster_remarks || '',
        teacherRemarks: existing?.class_teacher_remarks || '',
        attendance: existing ? { days: existing.attendance_days, total: existing.school_days } : null,
      });
    }

    // Calculate positions
    const sorted = [...results].sort((a, b) => b.average - a.average);
    sorted.forEach((r, i) => { r.position = i + 1; r.totalStudents = results.length; });

    res.json({ success: true, data: sorted });
  } catch (err) { next(err); }
};

exports.generateTermReport = async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.body;
    if (!class_id || !academic_year_id || !term_id) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const students = await query(
      `SELECT st.id FROM students st WHERE st.class_id = ? AND st.status = 'active'`,
      [class_id]
    );

    const settings = await queryOne('SELECT grading_system FROM school_settings LIMIT 1');
    const gradingSystem = settings?.grading_system ? JSON.parse(settings.grading_system) : null;

    let count = 0;
    for (const student of students) {
      const scores = await query(
        `SELECT ss.total_score FROM student_scores ss
         JOIN examinations e ON ss.examination_id = e.id
         WHERE ss.student_id = ? AND e.class_id = ? AND e.academic_year_id = ? AND e.term_id = ? AND e.status = 'approved'`,
        [student.id, class_id, academic_year_id, term_id]
      );

      if (!scores.length) continue;
      const total = scores.reduce((s, r) => s + parseFloat(r.total_score || 0), 0);
      const average = total / scores.length;
      const { grade } = getGrade(average, gradingSystem);

      await query(
        `INSERT INTO term_results (student_id, class_id, academic_year_id, term_id, total_subjects, total_marks, average_marks, overall_grade, total_students, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
         ON DUPLICATE KEY UPDATE total_subjects = ?, total_marks = ?, average_marks = ?, overall_grade = ?, total_students = ?`,
        [student.id, class_id, academic_year_id, term_id, scores.length, total, average, grade, students.length,
         scores.length, total, average, grade, students.length]
      );
      count++;
    }

    // Calculate positions
    const allResults = await query(
      'SELECT id, average_marks FROM term_results WHERE class_id = ? AND academic_year_id = ? AND term_id = ? ORDER BY average_marks DESC',
      [class_id, academic_year_id, term_id]
    );
    for (let i = 0; i < allResults.length; i++) {
      await query('UPDATE term_results SET position_in_class = ? WHERE id = ?', [i + 1, allResults[i].id]);
    }

    res.json({ success: true, message: `Term reports generated for ${count} students` });
  } catch (err) { next(err); }
};

exports.publishResults = async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.body;
    await query(
      "UPDATE term_results SET status = 'published' WHERE class_id = ? AND academic_year_id = ? AND term_id = ?",
      [class_id, academic_year_id, term_id]
    );

    // Notify parents async
    const students = await query(
      `SELECT s.id, s.guardian_email, s.guardian_phone, s.guardian_name,
              u.first_name, u.last_name, p_u.email AS parent_email, p_u.phone AS parent_phone
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN parents p ON s.parent_id = p.id LEFT JOIN users p_u ON p.user_id = p_u.id
       WHERE s.class_id = ? AND s.status = 'active'`,
      [class_id]
    );
    sendResultsNotification(students).catch(console.error);

    res.json({ success: true, message: 'Results published and parents notified' });
  } catch (err) { next(err); }
};

exports.downloadReportCard = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { academic_year_id, term_id } = req.query;

    const student = await queryOne(
      `SELECT st.*, u.first_name, u.last_name, u.profile_photo, c.class_name,
              ay.year_name, at.term_name
       FROM students st
       JOIN users u ON st.user_id = u.id
       LEFT JOIN classes c ON st.class_id = c.id
       LEFT JOIN academic_years ay ON ay.id = ?
       LEFT JOIN academic_terms at ON at.id = ?
       WHERE st.id = ?`,
      [academic_year_id, term_id, student_id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const scores = await query(
      `SELECT s.subject_name, s.subject_code, ss.class_test, ss.assignment, ss.mid_term,
              ss.end_of_term, ss.total_score, ss.grade, ss.remarks
       FROM student_scores ss
       JOIN examinations e ON ss.examination_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE ss.student_id = ? AND e.academic_year_id = ? AND e.term_id = ? AND e.status = 'approved'
       ORDER BY s.subject_name`,
      [student_id, academic_year_id, term_id]
    );

    const termResult = await queryOne(
      'SELECT * FROM term_results WHERE student_id = ? AND academic_year_id = ? AND term_id = ?',
      [student_id, academic_year_id, term_id]
    );

    const settings = await queryOne('SELECT * FROM school_settings LIMIT 1');

    const pdfBuffer = await generateReportCardPDF({ student, scores, termResult, settings });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${student.admission_number}-${term_id}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

exports.updateRemarks = async (req, res, next) => {
  try {
    const { student_id, academic_year_id, term_id, headmaster_remarks, class_teacher_remarks, next_term_begins } = req.body;
    await query(
      `UPDATE term_results SET headmaster_remarks = COALESCE(?, headmaster_remarks),
       class_teacher_remarks = COALESCE(?, class_teacher_remarks),
       next_term_begins = COALESCE(?, next_term_begins)
       WHERE student_id = ? AND academic_year_id = ? AND term_id = ?`,
      [headmaster_remarks, class_teacher_remarks, next_term_begins, student_id, academic_year_id, term_id]
    );
    res.json({ success: true, message: 'Remarks updated' });
  } catch (err) { next(err); }
};
