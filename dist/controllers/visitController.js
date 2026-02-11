import Visit from '../models/Visit.js';
import { getIO } from '../config/socket.js';
import { notifyAdmins } from '../utils/sendEmail.js';
export const createVisit = async (req, res) => {
    try {
        const { technicianName, siteName, gpsLocation } = req.body;
        const visit = await Visit.create({
            technicianName,
            siteName,
            gpsLocation,
            currentStep: 'arrivalPhotos',
            steps: {
                checkIn: { status: 'completed', completedAt: new Date() },
                arrivalPhotos: { status: 'in-progress' },
                departurePhotos: { status: 'pending' },
                complete: { status: 'pending' },
            },
            checkInTime: new Date(),
        });
        const io = getIO();
        io.to('admin-dashboard').emit('new-checkin', {
            visitId: visit._id.toString(),
            technicianName,
            siteName,
        });
        notifyAdmins(`New Check-in: ${technicianName} at ${siteName}`, `<h2>New Site Visit</h2><p><strong>${technicianName}</strong> checked in at <strong>${siteName}</strong></p><p>Location: ${gpsLocation.address || `${gpsLocation.lat}, ${gpsLocation.lng}`}</p>`).catch(console.error);
        res.status(201).json(visit);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getVisits = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status)
            filter.status = req.query.status;
        if (req.query.step)
            filter.currentStep = req.query.step;
        if (req.query.search) {
            const search = req.query.search;
            filter.$or = [
                { technicianName: { $regex: search, $options: 'i' } },
                { siteName: { $regex: search, $options: 'i' } },
            ];
        }
        if (req.query.dateFrom || req.query.dateTo) {
            filter.checkInTime = {};
            if (req.query.dateFrom)
                filter.checkInTime.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo)
                filter.checkInTime.$lte = new Date(req.query.dateTo);
        }
        const [visits, total] = await Promise.all([
            Visit.find(filter)
                .populate('arrivalPhotos')
                .populate('departurePhotos')
                .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Visit.countDocuments(filter),
        ]);
        res.json({
            visits,
            page,
            pages: Math.ceil(total / limit),
            total,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getVisitById = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .populate('arrivalPhotos')
            .populate('departurePhotos')
            .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } });
        if (!visit) {
            res.status(404).json({ message: 'Visit not found' });
            return;
        }
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const advanceStep = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            res.status(404).json({ message: 'Visit not found' });
            return;
        }
        const stepOrder = ['checkIn', 'arrivalPhotos', 'departurePhotos', 'complete'];
        const currentIdx = stepOrder.indexOf(visit.currentStep);
        if (currentIdx >= stepOrder.length - 1) {
            res.status(400).json({ message: 'Visit already complete' });
            return;
        }
        visit.steps[visit.currentStep].status = 'completed';
        visit.steps[visit.currentStep].completedAt = new Date();
        const nextStep = stepOrder[currentIdx + 1];
        visit.currentStep = nextStep;
        visit.steps[nextStep].status = 'in-progress';
        if (nextStep === 'complete') {
            visit.steps.complete.status = 'completed';
            visit.steps.complete.completedAt = new Date();
            visit.checkOutTime = new Date();
            visit.status = 'completed';
        }
        await visit.save();
        const io = getIO();
        io.to(`visit:${visit._id}`).emit('visit-updated', {
            visitId: visit._id.toString(),
            visit,
        });
        io.to('admin-dashboard').emit('visit-updated', {
            visitId: visit._id.toString(),
            visit,
        });
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const approveStep = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            res.status(404).json({ message: 'Visit not found' });
            return;
        }
        const currentStep = visit.currentStep;
        if (visit.steps[currentStep].status !== 'awaiting-approval') {
            res.status(400).json({ message: 'Step is not awaiting approval' });
            return;
        }
        visit.steps[currentStep].status = 'approved';
        visit.steps[currentStep].completedAt = new Date();
        const stepOrder = ['checkIn', 'arrivalPhotos', 'departurePhotos', 'complete'];
        const currentIdx = stepOrder.indexOf(currentStep);
        const nextStep = stepOrder[currentIdx + 1];
        if (nextStep) {
            visit.currentStep = nextStep;
            visit.steps[nextStep].status = 'in-progress';
            if (nextStep === 'complete') {
                visit.steps.complete.status = 'completed';
                visit.steps.complete.completedAt = new Date();
                visit.checkOutTime = new Date();
                visit.status = 'completed';
            }
        }
        if (visit.status === 'awaiting-approval') {
            visit.status = 'active';
        }
        await visit.save();
        const io = getIO();
        io.to(`visit:${visit._id}`).emit('step-approved', {
            visitId: visit._id.toString(),
            step: currentStep,
        });
        io.to('admin-dashboard').emit('visit-updated', {
            visitId: visit._id.toString(),
            visit,
        });
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const declineStep = async (req, res) => {
    try {
        const { reason } = req.body;
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            res.status(404).json({ message: 'Visit not found' });
            return;
        }
        const currentStep = visit.currentStep;
        if (visit.steps[currentStep].status !== 'awaiting-approval') {
            res.status(400).json({ message: 'Step is not awaiting approval' });
            return;
        }
        visit.steps[currentStep].status = 'declined';
        visit.steps[currentStep].declineReason = reason;
        visit.status = 'declined';
        await visit.save();
        const io = getIO();
        io.to(`visit:${visit._id}`).emit('step-declined', {
            visitId: visit._id.toString(),
            step: currentStep,
            reason,
        });
        io.to('admin-dashboard').emit('visit-updated', {
            visitId: visit._id.toString(),
            visit,
        });
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
