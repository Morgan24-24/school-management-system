const { sendEmail, buildFeeReceiptEmail, buildResultsEmail } = require('./emailService');
const { sendSMS, logNotification } = require('./smsService');

async function sendFeeNotification(student, payment) {
  const email = student.guardian_email || student.email;
  const phone = student.guardian_phone || student.phone;

  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `Fee Payment Receipt - ${payment.receipt_number}`,
        html: buildFeeReceiptEmail({ ...payment, ...student }),
      });
      await logNotification('email', student.user_id, null, email, `Fee Receipt ${payment.receipt_number}`,
        `Payment of GHS ${payment.amount_paid} received`, 'sent', null, 'fee_payment', payment.id);
    } catch (err) {
      await logNotification('email', student.user_id, null, email, `Fee Receipt`, err.message, 'failed', err.message, 'fee_payment', payment.id);
    }
  }

  if (phone) {
    const msg = `Dear Parent, fee payment of GHS ${parseFloat(payment.amount_paid).toFixed(2)} received for ${student.first_name} ${student.last_name}. Receipt: ${payment.receipt_number}. Thank you.`;
    const result = await sendSMS(phone, msg);
    await logNotification('sms', student.user_id, phone, null, 'Fee Receipt SMS',
      msg, result.success ? 'sent' : 'failed', result.error || null, 'fee_payment', payment.id);
  }
}

async function sendResultsNotification(students) {
  for (const student of students) {
    const email = student.parent_email || student.guardian_email;
    const phone = student.parent_phone || student.guardian_phone;

    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: 'Examination Results Are Now Available',
          html: buildResultsEmail(student, null),
        });
        await logNotification('email', null, null, email, 'Results Available', 'Results published', 'sent', null, 'results', student.id);
      } catch (err) {
        await logNotification('email', null, null, email, 'Results', err.message, 'failed', err.message, 'results', student.id);
      }
    }

    if (phone) {
      const msg = `Dear Parent, examination results for ${student.first_name} ${student.last_name} are now available. Login to the parent portal to view.`;
      const result = await sendSMS(phone, msg);
      await logNotification('sms', null, phone, null, 'Results SMS',
        msg, result.success ? 'sent' : 'failed', result.error || null, 'results', student.id);
    }
  }
}

async function sendFeeReminderNotification(students) {
  for (const student of students) {
    const phone = student.guardian_phone || student.phone;
    if (!phone) continue;

    const msg = `Dear Parent, ${student.first_name} ${student.last_name} has outstanding school fees of GHS ${parseFloat(student.balance || 0).toFixed(2)}. Please settle promptly. Thank you.`;
    const result = await sendSMS(phone, msg);
    await logNotification('sms', null, phone, null, 'Fee Reminder', msg,
      result.success ? 'sent' : 'failed', result.error || null, 'fee_reminder', student.id);
  }
}

module.exports = { sendFeeNotification, sendResultsNotification, sendFeeReminderNotification };
