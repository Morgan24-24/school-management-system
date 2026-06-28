const router = require('express').Router();
const ctrl = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadPhoto, uploadDocument } = require('../middleware/upload');

router.use(authenticate);

router.get('/', authorize('admin','headmaster','teacher','accountant'), ctrl.getAll);
router.get('/:id', authorize('admin','headmaster','teacher','accountant','parent','student'), ctrl.getById);
router.post('/', authorize('admin','headmaster'), uploadPhoto.single('photo'), ctrl.create);
router.put('/:id', authorize('admin','headmaster'), uploadPhoto.single('photo'), ctrl.update);
router.delete('/:id', authorize('admin','headmaster'), ctrl.remove);
router.patch('/:id/status', authorize('admin','headmaster','teacher'), ctrl.toggleStatus);
router.get('/:id/fees', ctrl.getFeeStatus);
router.post('/:id/promote', authorize('admin','headmaster'), ctrl.promote);
router.post('/bulk-import', authorize('admin','headmaster'), uploadDocument.single('file'), ctrl.bulkImport);

module.exports = router;
