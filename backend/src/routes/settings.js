const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

router.use(authenticate);

// Settings
router.get('/', ctrl.getSettings);
router.put('/', authorize('admin','headmaster'), uploadPhoto.single('logo'), ctrl.updateSettings);

// Academic years
router.get('/academic-years', ctrl.getAcademicYears);
router.post('/academic-years', authorize('admin','headmaster'), ctrl.createAcademicYear);

// Terms
router.get('/terms', ctrl.getTerms);
router.post('/terms', authorize('admin','headmaster'), ctrl.createTerm);

// Classes
router.get('/classes', ctrl.getClasses);
router.post('/classes', authorize('admin','headmaster'), ctrl.createClass);
router.put('/classes/:id', authorize('admin','headmaster'), ctrl.updateClass);
router.delete('/classes/:id', authorize('admin','headmaster'), ctrl.deleteClass);

// Subjects
router.get('/subjects', ctrl.getSubjects);
router.post('/subjects', authorize('admin','headmaster'), ctrl.createSubject);
router.put('/subjects/:id', authorize('admin','headmaster'), ctrl.updateSubject);

// Audit
router.get('/audit-logs', authorize('admin','headmaster'), ctrl.getAuditLogs);

module.exports = router;
