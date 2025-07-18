const { Resend } = require('resend');

const RESEND_SECRET_KEY = process.env.RESEND_SECRET_KEY;
const resend = new Resend(RESEND_SECRET_KEY);

/**
 * Send an email using Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.from] - Sender email address (default: 'onboarding@resend.dev')
 */
async function sendMail({ to, subject, html, from = 'onboarding@resend.dev' }) {
  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html
    });
    return response;
  } catch (error) {
    // Optionally log or handle error
    throw error;
  }
}

module.exports = {
  sendMail
}; 