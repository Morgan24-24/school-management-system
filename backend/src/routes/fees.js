const router = require('express').Router();
const ctrl = require('../controllers/feeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/structures', ctrl.getFeeStructures);
router.post('/structures', authorize('admin','headmaster','accountant'), ctrl.createFeeStructure);
router.put('/structures/:id', authorize('admin','headmaster','accountant'), ctrl.updateFeeStructure);
router.delete('/structures/:id', authorize('admin','headmaster'), ctrl.deleteFeeStructure);

router.get('/payments', authorize('admin','headmaster','accountant'), ctrl.getPayments);
router.post('/payments', authorize('admin','headmaster','accountant'), ctrl.recordPayment);
router.get('/payments/:id', ctrl.getReceiptById);
router.get('/payments/:id/receipt', ctrl.downloadReceipt);

router.get('/dashboard', authorize('admin','headmaster','accountant'), ctrl.getDashboardSummary);
router.get('/outstanding', authorize('admin','headmaster','accountant'), ctrl.getOutstandingFees);

module.exports = router;
