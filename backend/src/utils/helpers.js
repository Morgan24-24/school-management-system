const { v4: uuidv4 } = require('uuid');

function generateStudentId(prefix = 'STU') {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${year}${random}`;
}

function generateReceiptNumber() {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(100 + Math.random() * 900);
  return `RCP${ts}${rand}`;
}

function generateStaffId(prefix = 'TCH') {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${random}`;
}

function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base}${rand}`;
}

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function formatCurrency(amount, currency = 'GHS') {
  return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+233' + digits.slice(1);
  if (digits.startsWith('233')) return '+' + digits;
  return '+' + digits;
}

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { offset: (p - 1) * l, limit: l, page: p };
}

function buildSearchQuery(search, fields) {
  if (!search || !search.trim()) return { clause: '', params: [] };
  const term = `%${search.trim()}%`;
  const clause = fields.map(f => `${f} LIKE ?`).join(' OR ');
  return { clause: `(${clause})`, params: fields.map(() => term) };
}

module.exports = {
  generateStudentId,
  generateReceiptNumber,
  generateStaffId,
  generateUsername,
  generatePassword,
  formatCurrency,
  formatDate,
  sanitizePhone,
  paginate,
  buildSearchQuery,
};
