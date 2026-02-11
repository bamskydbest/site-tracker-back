import transporter from '../config/email.js';
import Admin from '../models/Admin.js';
export const notifyAdmins = async (subject, html) => {
    try {
        const admins = await Admin.find({}, 'email');
        const emails = admins.map((a) => a.email).join(',');
        if (!emails)
            return;
        await transporter.sendMail({
            from: process.env.MAIL_FROM || `"Site Tracker" <${process.env.SMTP_USER}>`,
            to: emails,
            subject,
            html,
        });
    }
    catch (error) {
        console.error('Email notification error:', error);
    }
};
