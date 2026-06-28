const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/admin', authorize('admin','headmaster'), ctrl.getAdminDashboard);
router.get('/teacher', authorize('teacher'), ctrl.getTeacherDashboard);
router.get('/parent', authorize('parent'), ctrl.getParentDashboard);
router.get('/student', authorize('student'), ctrl.getStudentDashboard);
router.get('/accountant', authorize('accountant'), ctrl.getAccountantDashboard);

module.exports = router;
