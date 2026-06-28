const bcrypt = require('bcryptjs');
const { query, queryOne, transaction } = require('../config/database');
const { generateUsername, generatePassword } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const users = await query(
      `SELECT id, username, email, role, first_name, last_name, phone, is_active, last_login, created_at
       FROM users WHERE role IN ('admin','headmaster','accountant') ORDER BY role, first_name`,
    );
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, role } = req.body;
    if (!first_name || !last_name || !role) {
      return res.status(400).json({ success: false, message: 'First name, last name and role are required' });
    }
    const allowed = ['admin', 'headmaster', 'accountant'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin, headmaster or accountant' });
    }

    const username = generateUsername(first_name, last_name);
    const password = generatePassword(10);
    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, email || null, hash, role, first_name, last_name, phone || null]
    );

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created`,
      data: { id: result.insertId, username, temporaryPassword: password, role },
    });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, is_active } = req.body;
    await query(
      `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
       email = COALESCE(?, email), phone = COALESCE(?, phone),
       is_active = COALESCE(?, is_active) WHERE id = ? AND role IN ('admin','headmaster','accountant')`,
      [first_name ?? null, last_name ?? null, email ?? null, phone ?? null, is_active ?? null, req.params.id]
    );
    res.json({ success: true, message: 'User updated' });
  } catch (err) { next(err); }
};

exports.deactivate = async (req, res, next) => {
  try {
    const user = await queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
};
