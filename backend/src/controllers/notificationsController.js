const { query, queryOne } = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const notifications = await query(
      `SELECT id, subject, message, is_read, reference_type, reference_id, created_at
       FROM notifications
       WHERE recipient_user_id = ? AND notification_type = 'in_app'
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = notifications.filter(n => !n.is_read).length;
    res.json({ success: true, data: notifications, unread });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND notification_type = 'in_app'",
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// Internal helper — called from other controllers
exports.create = async (recipientUserIds, subject, message, referenceType = null, referenceId = null) => {
  try {
    const ids = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
    for (const uid of ids) {
      await query(
        `INSERT INTO notifications (recipient_user_id, notification_type, subject, message, status, sent_at, reference_type, reference_id)
         VALUES (?, 'in_app', ?, ?, 'sent', NOW(), ?, ?)`,
        [uid, subject, message, referenceType, referenceId]
      );
    }
  } catch (_) {}
};
