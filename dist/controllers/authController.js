import Admin from '../models/Admin.js';
import { generateToken } from '../utils/tokenUtils.js';
export const register = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const login = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getMe = async (req, res) => {
    try {
        res.json(req.admin);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getPendingAdmins = async (req, res) => {
    try {
        if (req.admin?.role !== 'superadmin') {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        const pending = await Admin.find({ status: 'pending' }).select('-password').sort({ createdAt: -1 });
        res.json(pending);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const approveAdmin = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const rejectAdmin = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
