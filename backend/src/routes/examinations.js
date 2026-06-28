const router = require('express').Router();
const ctrl = require('../controllers/examinationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getExaminations);
router.post('/', authorize('admin','headmaster','teacher'), ctrl.createExamination);

router.get('/term-results', ctrl.getTermResults);
router.post('/generate-term-report', authorize('admin','headmaster'), ctrl.generateTermReport);
router.post('/publish-results', authorize('admin','headmaster'), ctrl.publishResults);
router.put('/remarks', authorize('admin','headmaster','teacher'), ctrl.updateRemarks);

router.get('/:exam_id/scores', ctrl.getScores);
router.post('/:exam_id/scores', authorize('admin','headmaster','teacher'), ctrl.saveScores);
router.put('/:exam_id/approve', authorize('admin','headmaster'), ctrl.approveExamination);
router.put('/:exam_id', authorize('admin','headmaster','teacher'), ctrl.updateExamination);
router.delete('/:exam_id', authorize('admin','headmaster','teacher'), ctrl.deleteExamination);

router.get('/students/:student_id/report-card', ctrl.downloadReportCard);

module.exports = router;
