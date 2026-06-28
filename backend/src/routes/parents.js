const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query, queryOne, transaction } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { generateUsername, generatePassword, paginate, buildSearchQuery } = require('../utils/helpers');

router.use(authenticate);

router.get('/', authorize('admin','headmaster','accountant'), async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search } = req.query;
    let conditions = ['1=1'], params = [];

    if (search) {
      const { clause, params: sp } = buildSearchQuery(search, ['u.first_name','u.last_name','u.email','u.phone']);
      if (clause) { conditions.push(clause); params.push(...sp); }
    }

    const [parents, [{ total }]] = await Promise.all([
      query(
        `SELECT p.id, p.occupation, p.relationship_type, u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
                COUNT(s.id) AS children_count
         FROM parents p JOIN users u ON p.user_id = u.id
         LEFT JOIN students s ON s.parent_id = p.id
         WHERE ${conditions.join(' AND ')} GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) AS total FROM parents p JOIN users u ON p.user_id = u.id WHERE ${conditions.join(' AND ')}`, params),
    ]);

    res.json({ success: true, data: parents, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const parent = await queryOne(
      `SELECT p.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo
       FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found' });

    const children = await query(
      `SELECT s.id, u.first_name, u.last_name, s.admission_number, c.class_name
       FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.parent_id = ?`,
      [parent.id]
    );
    res.json({ success: true, data: { ...parent, children } });
  } catch (err) { next(err); }
});

router.get('/:id/children', async (req, res, next) => {
  try {
    // Allow parents to see only their own children
    if (req.user.role === 'parent') {
      const parent = await queryOne('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent || parent.id !== parseInt(req.params.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    const children = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.profile_photo, c.class_name, c.stream
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id WHERE s.parent_id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: children });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin','headmaster'), async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, occupation, address, relationship_type } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'First and last name required' });
    }

    const username = generateUsername(first_name, last_name);
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 12);

    const result = await transaction(async (conn) => {
      const [ur] = await conn.execute(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, 'parent', ?, ?, ?)`,
        [username, email || null, hash, first_name, last_name, phone || null]
      );
      const [pr] = await conn.execute(
        'INSERT INTO parents (user_id, occupation, address, relationship_type) VALUES (?, ?, ?, ?)',
        [ur.insertId, occupation || null, address || null, relationship_type || 'guardian']
      );
      return { parentId: pr.insertId, username, password };
    });

    res.status(201).json({
      success: true, message: 'Parent registered',
      data: { id: result.parentId, username: result.username, temporaryPassword: result.password },
    });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('admin','headmaster'), async (req, res, next) => {
  try {
    const parent = await queryOne('SELECT user_id FROM parents WHERE id = ?', [req.params.id]);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found' });
    const { first_name, last_name, email, phone, occupation, address, relationship_type } = req.body;
    await query(
      `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
       email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?`,
      [first_name, last_name, email, phone, parent.user_id]
    );
    await query(
      `UPDATE parents SET occupation = COALESCE(?, occupation), address = COALESCE(?, address),
       relationship_type = COALESCE(?, relationship_type) WHERE id = ?`,
      [occupation, address, relationship_type, req.params.id]
    );
    res.json({ success: true, message: 'Parent updated' });
  } catch (err) { next(err); }
});

module.exports = router;
