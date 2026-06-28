const router = require('express').Router();
const ctrl = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

router.use(authenticate);

router.get('/', authorize('admin','headmaster'), ctrl.getAll);
router.get('/my-classes', authorize('teacher'), ctrl.getMyClasses);
router.get('/:id', authorize('admin','headmaster','teacher'), ctrl.getById);
router.post('/', authorize('admin','headmaster'), uploadPhoto.single('photo'), ctrl.create);
router.put('/:id', authorize('admin','headmaster'), uploadPhoto.single('photo'), ctrl.update);
router.delete('/:id', authorize('admin','headmaster'), ctrl.remove);
router.post('/:id/assign-subject', authorize('admin','headmaster'), ctrl.assignSubject);
router.delete('/:id/assignments/:assignmentId', authorize('admin','headmaster'), ctrl.removeSubjectAssignment);

module.exports = router;
