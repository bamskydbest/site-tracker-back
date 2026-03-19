import crypto from 'crypto';
import type { Request, Response } from 'express';
import Admin from '../models/Admin.js';
import { generateToken } from '../utils/tokenUtils.js';
import { sendEmailTo } from '../utils/sendEmail.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      res.status(400).json({ message: 'An account with this email already exists' });
      return;
    }

    await Admin.create({ name, email, password, department, status: 'pending', role: 'admin' });

    res.status(201).json({
      message: 'Registration submitted successfully. A superadmin will review your request and activate your account.',
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (admin.status === 'pending') {
      res.status(401).json({ message: 'Your account is awaiting superadmin approval.' });
      return;
    }

    const token = generateToken(admin._id.toString(), admin.role);

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      department: admin.department,
      status: admin.status,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(req.admin);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── Superadmin: pending registrations ──────────────────────────────────────

export const getPendingAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const pending = await Admin.find({ status: 'pending' }).select('-password -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const approveAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
    admin.status = 'active';
    await admin.save();
    res.json({ message: `${admin.name}'s account has been approved.` });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const rejectAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
    const name = admin.name;
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: `${name}'s registration has been rejected and removed.` });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── Superadmin: all department heads ───────────────────────────────────────

export const getAllAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const admins = await Admin.find({ role: 'admin' })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
    if (admin.role === 'superadmin') {
      res.status(400).json({ message: 'Cannot delete superadmin account' });
      return;
    }
    const name = admin.name;
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: `${name}'s account has been removed.` });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── Password recovery ──────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const successMsg = { message: 'If that email is registered, a reset link has been sent.' };

    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.json(successMsg);
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    admin.resetPasswordToken = hash;
    admin.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    await sendEmailTo(
      admin.email,
      'Site Tracker — Password Reset',
      `<h2>Password Reset Request</h2>
       <p>Hello ${admin.name},</p>
       <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
       <p style="margin:24px 0">
         <a href="${resetUrl}" style="background:#002f6c;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
           Reset Password
         </a>
       </p>
       <p>If you did not request this, you can safely ignore this email.</p>`
    );

    res.json(successMsg);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const admin = await Admin.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!admin) {
      res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
      return;
    }

    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
