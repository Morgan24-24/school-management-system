const { query, queryOne } = require('../config/database');

exports.getAdminDashboard = async (req, res, next) => {
  try {
    const [
      [{ total_students }],
      [{ total_teachers }],
      [{ total_classes }],
      [{ total_parents }],
      [{ fees_collected }],
      [{ fees_outstanding }],
      recentPayments,
      recentStudents,
      monthlyFees,
      classPerformance,
      enrollmentByClass,
    ] = await Promise.all([
      query("SELECT COUNT(*) AS total_students FROM students WHERE status = 'active'"),
      query("SELECT COUNT(*) AS total_teachers FROM teachers WHERE status = 'active'"),
      query("SELECT COUNT(*) AS total_classes FROM classes WHERE status = 'active'"),
      query("SELECT COUNT(*) AS total_parents FROM parents"),
      query("SELECT COALESCE(SUM(amount_paid),0) AS fees_collected FROM fee_payments WHERE status = 'confirmed' AND YEAR(payment_date) = YEAR(NOW())"),
      query(
        `SELECT COALESCE(SUM(fs.amount - COALESCE(paid.total, 0)), 0) AS fees_outstanding
         FROM fee_structures fs
         LEFT JOIN (
           SELECT fp.student_id, SUM(fp.amount_paid) AS total
           FROM fee_payments fp WHERE fp.status = 'confirmed'
           GROUP BY fp.student_id
         ) paid ON 1=1`
      ),
      query(
        `SELECT fp.id, fp.receipt_number, fp.amount_paid, fp.payment_date, fp.payment_method,
                u.first_name, u.last_name, c.class_name
         FROM fee_payments fp
         JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE fp.status = 'confirmed'
         ORDER BY fp.created_at DESC LIMIT 5`
      ),
      query(
        `SELECT s.id, u.first_name, u.last_name, c.class_name, s.admission_number, s.created_at
         FROM students s JOIN users u ON s.user_id = u.id
         LEFT JOIN classes c ON s.class_id = c.id
         ORDER BY s.id DESC LIMIT 5`
      ),
      query(
        `SELECT DATE_FORMAT(payment_date, '%b %Y') AS month,
                SUM(amount_paid) AS collected, MONTH(payment_date) AS m, YEAR(payment_date) AS y
         FROM fee_payments WHERE status = 'confirmed' AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY y, m, DATE_FORMAT(payment_date, '%b %Y') ORDER BY y ASC, m ASC`
      ),
      query(
        `SELECT c.class_name, AVG(tr.average_marks) AS avg_score, COUNT(tr.id) AS student_count
         FROM term_results tr JOIN classes c ON tr.class_id = c.id
         WHERE tr.status = 'published'
         GROUP BY c.id ORDER BY c.id`
      ),
      query(
        `SELECT c.class_name, COUNT(s.id) AS count
         FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
         WHERE c.status = 'active' GROUP BY c.id ORDER BY c.id`
      ),
    ]);

    res.json({
      success: true,
      data: {
        stats: { total_students, total_teachers, total_classes, total_parents, fees_collected, fees_outstanding },
        recentPayments,
        recentStudents,
        charts: { monthlyFees, classPerformance, enrollmentByClass },
      },
    });
  } catch (err) { next(err); }
};

exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const teacher = await queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const [myClasses, pendingExams, recentScores] = await Promise.all([
      query(
        `SELECT c.id, c.class_name, c.stream, COUNT(DISTINCT s.id) AS student_count,
                COUNT(DISTINCT ts.subject_id) AS subject_count
         FROM teacher_subjects ts
         JOIN classes c ON ts.class_id = c.id
         LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
         WHERE ts.teacher_id = ? GROUP BY c.id`,
        [teacher.id]
      ),
      query(
        `SELECT e.id, e.exam_name, e.exam_type, e.status, c.class_name, s.subject_name
         FROM examinations e
         JOIN classes c ON e.class_id = c.id JOIN subjects s ON e.subject_id = s.id
         WHERE e.teacher_id = ? AND e.status IN ('draft','submitted')
         ORDER BY e.created_at DESC LIMIT 10`,
        [teacher.id]
      ),
      query(
        `SELECT e.exam_name, c.class_name, s.subject_name, COUNT(ss.id) AS scored,
                AVG(ss.total_score) AS avg_score
         FROM examinations e
         JOIN student_scores ss ON ss.examination_id = e.id
         JOIN classes c ON e.class_id = c.id JOIN subjects s ON e.subject_id = s.id
         WHERE e.teacher_id = ? AND e.status = 'approved'
         GROUP BY e.id ORDER BY e.id DESC LIMIT 5`,
        [teacher.id]
      ),
    ]);

    res.json({ success: true, data: { myClasses, pendingExams, recentScores } });
  } catch (err) { next(err); }
};

exports.getParentDashboard = async (req, res, next) => {
  try {
    const parent = await queryOne('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found' });

    const children = await query(
      `SELECT s.id, u.first_name, u.last_name, s.admission_number, c.class_name, s.status, u.profile_photo
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.parent_id = ?`,
      [parent.id]
    );

    const childData = [];
    for (const child of children) {
      const [feeStatus] = await query(
        `SELECT COALESCE(SUM(DISTINCT fs.amount), 0) AS expected,
                COALESCE(SUM(DISTINCT fp.amount_paid), 0) AS paid
         FROM fee_structures fs
         LEFT JOIN fee_payments fp ON fp.student_id = ?
         WHERE fs.class_id = (SELECT class_id FROM students WHERE id = ?)`,
        [child.id, child.id]
      );
      const lastResult = await queryOne(
        `SELECT tr.average_marks, tr.overall_grade, tr.position_in_class, tr.total_students, at.term_name, ay.year_name
         FROM term_results tr JOIN academic_terms at ON tr.term_id = at.id JOIN academic_years ay ON tr.academic_year_id = ay.id
         WHERE tr.student_id = ? AND tr.status = 'published' ORDER BY tr.id DESC LIMIT 1`,
        [child.id]
      );
      childData.push({ ...child, feeStatus: feeStatus || { expected: 0, paid: 0 }, lastResult });
    }

    res.json({ success: true, data: { children: childData } });
  } catch (err) { next(err); }
};

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const student = await queryOne(
      `SELECT s.*, u.first_name, u.last_name, u.profile_photo, c.class_name
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [termResults, feeStatus, recentScores] = await Promise.all([
      query(
        `SELECT tr.*, at.term_name, ay.year_name
         FROM term_results tr JOIN academic_terms at ON tr.term_id = at.id
         JOIN academic_years ay ON tr.academic_year_id = ay.id
         WHERE tr.student_id = ? AND tr.status = 'published' ORDER BY tr.id DESC LIMIT 4`,
        [student.id]
      ),
      query(
        `SELECT COALESCE(SUM(fp.amount_paid), 0) AS paid
         FROM fee_payments fp WHERE fp.student_id = ? AND fp.status = 'confirmed'`,
        [student.id]
      ),
      query(
        `SELECT ss.total_score, ss.grade, s.subject_name, e.exam_name, e.exam_type
         FROM student_scores ss
         JOIN examinations e ON ss.examination_id = e.id JOIN subjects s ON e.subject_id = s.id
         WHERE ss.student_id = ? AND e.status = 'approved'
         ORDER BY ss.id DESC LIMIT 6`,
        [student.id]
      ),
    ]);

    res.json({ success: true, data: { student, termResults, feeStatus: feeStatus[0], recentScores } });
  } catch (err) { next(err); }
};

exports.getAccountantDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [
      [{ today_collected }],
      [{ week_collected }],
      [{ month_collected }],
      [{ year_collected }],
      todayPayments,
      paymentMethods,
    ] = await Promise.all([
      query("SELECT COALESCE(SUM(amount_paid),0) AS today_collected FROM fee_payments WHERE status='confirmed' AND payment_date = ?", [today]),
      query("SELECT COALESCE(SUM(amount_paid),0) AS week_collected FROM fee_payments WHERE status='confirmed' AND YEARWEEK(payment_date) = YEARWEEK(NOW())"),
      query("SELECT COALESCE(SUM(amount_paid),0) AS month_collected FROM fee_payments WHERE status='confirmed' AND MONTH(payment_date)=MONTH(NOW()) AND YEAR(payment_date)=YEAR(NOW())"),
      query("SELECT COALESCE(SUM(amount_paid),0) AS year_collected FROM fee_payments WHERE status='confirmed' AND YEAR(payment_date)=YEAR(NOW())"),
      query(
        `SELECT fp.receipt_number, fp.amount_paid, fp.payment_method, fp.payment_date,
                u.first_name, u.last_name, c.class_name
         FROM fee_payments fp JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id
         WHERE fp.status = 'confirmed' AND fp.payment_date = ? ORDER BY fp.id DESC LIMIT 10`,
        [today]
      ),
      query(
        `SELECT payment_method, COUNT(*) AS count, SUM(amount_paid) AS total
         FROM fee_payments WHERE status = 'confirmed' AND MONTH(payment_date)=MONTH(NOW()) AND YEAR(payment_date)=YEAR(NOW())
         GROUP BY payment_method`
      ),
    ]);

    res.json({
      success: true,
      data: {
        stats: { today_collected, week_collected, month_collected, year_collected },
        todayPayments,
        paymentMethods,
      },
    });
  } catch (err) { next(err); }
};
