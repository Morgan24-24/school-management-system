const nodemailer = require('nodemailer');
const { queryOne } = require('../config/database');

async function getTransporter() {
  const settings = await queryOne('SELECT * FROM school_settings LIMIT 1');

  return nodemailer.createTransport({
    host: settings?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(settings?.smtp_port || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: settings?.smtp_user || process.env.SMTP_USER,
      pass: settings?.smtp_password || process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!to) throw new Error('Recipient email is required');

  const settings = await queryOne('SELECT smtp_from, school_name, email_enabled FROM school_settings LIMIT 1');
  if (settings && !settings.email_enabled) {
    console.log('Email notifications disabled');
    return null;
  }

  const transporter = await getTransporter();
  const from = settings?.smtp_from || process.env.SMTP_FROM || `"School SMS" <noreply@school.edu.gh>`;

  const info = await transporter.sendMail({ from, to, subject, html, attachments });
  return info;
}

function buildFeeReceiptEmail(payment) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background: #1e40af; color: white; padding: 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; }
      .body { padding: 30px; }
      .amount-box { background: #eff6ff; border: 2px solid #1e40af; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
      .amount { font-size: 32px; font-weight: bold; color: #1e40af; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
      .info-item label { font-size: 12px; color: #6b7280; text-transform: uppercase; display: block; }
      .info-item span { font-weight: bold; font-size: 14px; }
      .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Fee Payment Receipt</h1>
          <p style="margin:5px 0;opacity:0.9">${payment.school_name || 'School Management System'}</p>
        </div>
        <div class="body">
          <p>Dear <strong>${payment.guardian_name || payment.first_name}</strong>,</p>
          <p>This confirms receipt of fee payment for <strong>${payment.first_name} ${payment.last_name}</strong>.</p>
          <div class="amount-box">
            <p style="margin:0;font-size:14px;color:#6b7280">Amount Paid</p>
            <div class="amount">GHS ${parseFloat(payment.amount_paid).toFixed(2)}</div>
          </div>
          <div class="info-grid">
            <div class="info-item"><label>Receipt No</label><span>${payment.receipt_number}</span></div>
            <div class="info-item"><label>Date</label><span>${new Date(payment.payment_date).toLocaleDateString('en-GB')}</span></div>
            <div class="info-item"><label>Student</label><span>${payment.first_name} ${payment.last_name}</span></div>
            <div class="info-item"><label>Class</label><span>${payment.class_name || '-'}</span></div>
            <div class="info-item"><label>Term</label><span>${payment.term_name}</span></div>
            <div class="info-item"><label>Method</label><span>${(payment.payment_method || '').replace('_',' ').toUpperCase()}</span></div>
          </div>
          <p style="color:#6b7280;font-size:13px">Please keep this email as your payment confirmation.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${payment.school_name || 'School Management System'}</p>
          <p>This is an automated email — please do not reply.</p>
        </div>
      </div>
    </body></html>`;
}

function buildResultsEmail(student, termResult) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; color: #333; background: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
      .header { background: #1e40af; color: white; padding: 25px; text-align: center; }
      .body { padding: 25px; }
      .result-box { background: #eff6ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
      .grade { font-size: 48px; font-weight: bold; color: #1e40af; }
      .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Examination Results Available</h1>
        </div>
        <div class="body">
          <p>Dear Parent/Guardian of <strong>${student.first_name} ${student.last_name}</strong>,</p>
          <p>The examination results for <strong>${termResult?.term_name || 'this term'}</strong> are now available.</p>
          ${termResult ? `
          <div class="result-box">
            <p style="margin:0;color:#6b7280">Overall Grade</p>
            <div class="grade">${termResult.overall_grade || '-'}</div>
            <p>Average: <strong>${parseFloat(termResult.average_marks || 0).toFixed(1)}%</strong></p>
            <p>Position: <strong>${termResult.position_in_class || '-'} of ${termResult.total_students || '-'}</strong></p>
          </div>` : ''}
          <p>Log in to the parent portal to view the full report card and download a PDF copy.</p>
        </div>
        <div class="footer"><p>This is an automated message. Please do not reply.</p></div>
      </div>
    </body></html>`;
}

module.exports = { sendEmail, buildFeeReceiptEmail, buildResultsEmail };
