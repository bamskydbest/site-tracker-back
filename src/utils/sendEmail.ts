import transporter from '../config/email.js';
import Admin from '../models/Admin.js';

const FROM = process.env.MAIL_FROM || `"K-NET Site Tracker" <${process.env.SMTP_USER}>`;

export const sendEmailTo = async (to: string, subject: string, html: string): Promise<void> => {
  await transporter.sendMail({ from: FROM, to, subject, html });
};

export const notifyAdmins = async (subject: string, html: string): Promise<void> => {
  try {
    const admins = await Admin.find({ status: 'active' }, 'email');
    const emails = admins.map((a) => a.email).join(',');
    if (!emails) return;
    await transporter.sendMail({ from: FROM, to: emails, subject, html });
  } catch (error) {
    console.error('Email notification error:', error);
  }
};

/**
 * Notifies all active superadmins + any active admin whose department
 * matches the visit's department. Deduplicates by email address.
 */
export const notifyDepartmentAndSuperadmins = async (
  department: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const recipients = await Admin.find(
      {
        status: 'active',
        $or: [
          { role: 'superadmin' },
          { role: 'admin', department: department },
        ],
      },
      'email'
    );

    const emails = [...new Set(recipients.map((a) => a.email))].join(',');
    if (!emails) return;

    await transporter.sendMail({ from: FROM, to: emails, subject, html });
  } catch (error) {
    console.error('Email notification error:', error);
  }
};
