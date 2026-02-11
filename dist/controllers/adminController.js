import Visit from '../models/Visit.js';
import { generatePDF, generateCSV } from '../utils/generateReport.js';
export const getDashboardStats = async (_req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [total, active, awaitingApproval, completedToday] = await Promise.all([
            Visit.countDocuments(),
            Visit.countDocuments({ status: 'active' }),
            Visit.countDocuments({ status: 'awaiting-approval' }),
            Visit.countDocuments({ status: 'completed', checkOutTime: { $gte: today } }),
        ]);
        res.json({ total, active, awaitingApproval, completedToday });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const exportReport = async (req, res) => {
    try {
        const format = req.query.format || 'pdf';
        const filter = {};
        if (req.query.status)
            filter.status = req.query.status;
        if (req.query.dateFrom || req.query.dateTo) {
            filter.checkInTime = {};
            if (req.query.dateFrom)
                filter.checkInTime.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo)
                filter.checkInTime.$lte = new Date(req.query.dateTo);
        }
        const visits = await Visit.find(filter).sort({ createdAt: -1 }).lean();
        if (format === 'csv') {
            generateCSV(visits, res);
        }
        else {
            generatePDF(visits, res);
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
