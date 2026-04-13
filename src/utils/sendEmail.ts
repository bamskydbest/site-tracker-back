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

export const notifyExternalVisitor = async (
  email: string,
  name: string,
  siteName: string,
  status: 'approved' | 'declined',
  reason?: string
): Promise<void> => {
  const subject =
    status === 'approved'
      ? `Site Visit Approved — ${siteName}`
      : `Site Visit Declined — ${siteName}`;

  const html =
    status === 'approved'
      ? `<h2>Visit Request Approved</h2>
         <p>Dear ${name},</p>
         <p>Your request to visit <strong>${siteName}</strong> has been <strong style="color:#16a34a">approved</strong>. You may proceed to the site.</p>
         <p>Thank you.</p>`
      : `<h2>Visit Request Declined</h2>
         <p>Dear ${name},</p>
         <p>Your request to visit <strong>${siteName}</strong> has been <strong style="color:#dc2626">declined</strong>.</p>
         ${reason ? `<p>Reason: <em>${reason}</em></p>` : ''}
         <p>Please contact the relevant department for further assistance.</p>`;

  await transporter.sendMail({ from: FROM, to: email, subject, html });
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
