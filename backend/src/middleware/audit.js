const { query } = require('../config/database');

function auditLog(action, tableName = null) {
  return async (req, res, next) => {
    const originalSend = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await query(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user.id,
              action,
              tableName,
              data?.data?.id || null,
              JSON.stringify(req.body || {}),
              req.ip,
              req.get('user-agent') || '',
            ]
          );
        } catch (_) {}
      }
      return originalSend(data);
    };
    next();
  };
}

module.exports = { auditLog };
