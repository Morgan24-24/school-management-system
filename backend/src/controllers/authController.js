const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

function signTokens(userId, role) {
  const access = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refresh = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { access, refresh };
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await queryOne(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
      [username, username]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { access, refresh } = signTokens(user.id, user.role);
    await query('UPDATE users SET last_login = NOW(), refresh_token = ? WHERE id = ?', [refresh, user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: access,
        refreshToken: refresh,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          profilePhoto: user.profile_photo,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await queryOne(
      'SELECT id, role, is_active, refresh_token FROM users WHERE id = ? AND refresh_token = ?',
      [decoded.userId, refreshToken]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const { access, refresh } = signTokens(user.id, user.role);
    await query('UPDATE users SET refresh_token = ? WHERE id = ?', [refresh, user.id]);

    res.json({ success: true, data: { token: access, refreshToken: refresh } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
              u.phone, u.profile_photo, u.last_login, u.created_at
       FROM users u WHERE u.id = ?`,
      [req.user.id]
    );

    let extra = null;
    if (req.user.role === 'teacher') {
      extra = await queryOne('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
    } else if (req.user.role === 'student') {
      extra = await queryOne(
        `SELECT s.*, c.class_name FROM students s
         LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?`,
        [req.user.id]
      );
    } else if (req.user.role === 'parent') {
      extra = await queryOne('SELECT * FROM parents WHERE user_id = ?', [req.user.id]);
    }

    res.json({ success: true, data: { ...user, profile: extra } });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = ?, refresh_token = NULL WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
