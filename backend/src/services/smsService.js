const { queryOne, query } = require('../config/database');

async function getClient() {
  const settings = await queryOne('SELECT * FROM school_settings LIMIT 1');
  if (!settings?.sms_enabled) return null;

  const sid = settings.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
  const token = settings.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;

  const twilio = require('twilio');
  return { client: twilio(sid, token), from: settings.twilio_phone || process.env.TWILIO_PHONE_NUMBER };
}

async function sendSMS(to, message) {
  if (!to) return { success: false, error: 'No phone number' };

  try {
    const config = await getClient();
    if (!config) return { success: false, error: 'SMS not configured' };

    const phone = to.startsWith('+') ? to : `+233${to.replace(/^0/, '')}`;
    const result = await config.client.messages.create({ body: message, from: config.from, to: phone });
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error('SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

async function logNotification(type, recipientUserId, phone, email, subject, message, status, errorMsg, refType, refId) {
  try {
    await query(
      `INSERT INTO notifications (recipient_user_id, recipient_phone, recipient_email, notification_type, subject, message, status, error_message, sent_at, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [recipientUserId || null, phone || null, email || null, type, subject || null, message,
       status, errorMsg || null, status === 'sent' ? new Date() : null, refType || null, refId || null]
    );
  } catch (_) {}
}

module.exports = { sendSMS, logNotification };
