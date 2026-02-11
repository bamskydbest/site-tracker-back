import type { Request, Response } from 'express';
import Visit from '../models/Visit.js';
import { generatePDF, generateCSV } from '../utils/generateReport.js';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'pdf';
    const filter: Record<string, unknown> = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.checkInTime = {};
      if (req.query.dateFrom) (filter.checkInTime as Record<string, unknown>).$gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) (filter.checkInTime as Record<string, unknown>).$lte = new Date(req.query.dateTo as string);
    }

    const visits = await Visit.find(filter).sort({ createdAt: -1 }).lean();

    if (format === 'csv') {
      generateCSV(visits, res);
    } else {
      generatePDF(visits, res);
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
