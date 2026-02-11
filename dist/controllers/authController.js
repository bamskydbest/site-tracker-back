import Admin from '../models/Admin.js';
import { generateToken } from '../utils/tokenUtils.js';
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await Admin.findOne({ email });
        if (exists) {
            res.status(400).json({ message: 'Admin already exists' });
            return;
        }
        const admin = await Admin.create({ name, email, password });
        const token = generateToken(admin._id.toString(), admin.role);
        res.status(201).json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            token,
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
        const token = generateToken(admin._id.toString(), admin.role);
        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
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
