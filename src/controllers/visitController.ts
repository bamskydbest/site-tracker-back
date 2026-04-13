import type { Request, Response } from 'express';
import Visit from '../models/Visit.js';
import { getIO } from '../config/socket.js';
import { notifyDepartmentAndSuperadmins, notifyExternalVisitor } from '../utils/sendEmail.js';

export const createVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { technicianName, siteName, gpsLocation, reason, department, idempotencyKey, visitorType, companyName, contactEmail } = req.body;

    if (idempotencyKey) {
      const existing = await Visit.findOne({ idempotencyKey })
        .populate('arrivalPhotos')
        .populate('departurePhotos')
        .populate('installationPhotos')
        .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } });
      if (existing) {
        res.status(201).json(existing);
        return;
      }
    }

    const isExternal = visitorType === 'external';

    const visit = await Visit.create({
      technicianName,
      siteName,
      reason,
      department: department || '',
      visitorType: isExternal ? 'external' : 'internal',
      ...(isExternal && companyName ? { companyName } : {}),
      ...(isExternal && contactEmail ? { contactEmail } : {}),
      gpsLocation,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      currentStep: 'arrivalPhotos',
      steps: {
        checkIn: { status: 'completed', completedAt: new Date() },
        arrivalPhotos: { status: isExternal ? 'awaiting-approval' : 'in-progress' },
        departurePhotos: { status: 'pending' },
        complete: { status: 'pending' },
      },
      status: isExternal ? 'awaiting-approval' : 'active',
      checkInTime: new Date(),
    });

    const io = getIO();
    io.to('admin-dashboard').emit('new-checkin', {
      visitId: visit._id.toString(),
      technicianName,
      siteName,
    });

    if (isExternal) {
      notifyDepartmentAndSuperadmins(
        department || '',
        `External Visitor Request: ${technicianName} at ${siteName}`,
        `<h2>External Visitor Request</h2>
         <p><strong>${technicianName}</strong>${companyName ? ` from <strong>${companyName}</strong>` : ''} has requested access to <strong>${siteName}</strong>.</p>
         <p>Department: <strong>${department || 'N/A'}</strong></p>
         <p>Reason: ${reason}</p>
         <p>Location: ${gpsLocation?.address || `${gpsLocation?.lat}, ${gpsLocation?.lng}`}</p>
         <p>Please review and approve or decline this request.</p>`
      ).catch(console.error);
    } else {
      notifyDepartmentAndSuperadmins(
        department || '',
        `New Check-in: ${technicianName} at ${siteName}`,
        `<h2>New Site Visit</h2><p><strong>${technicianName}</strong> checked in at <strong>${siteName}</strong>.</p><p>Department: <strong>${department || 'N/A'}</strong></p><p>Location: ${gpsLocation?.address || `${gpsLocation?.lat}, ${gpsLocation?.lng}`}</p>`
      ).catch(console.error);
    }

    res.status(201).json(visit);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.step) filter.currentStep = req.query.step;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.search) {
      const search = req.query.search as string;
      filter.$or = [
        { technicianName: { $regex: search, $options: 'i' } },
        { siteName: { $regex: search, $options: 'i' } },
      ];
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.checkInTime = {};
      if (req.query.dateFrom) (filter.checkInTime as Record<string, unknown>).$gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) (filter.checkInTime as Record<string, unknown>).$lte = new Date(req.query.dateTo as string);
    }

    const [visits, total] = await Promise.all([
      Visit.find(filter)
        .populate('arrivalPhotos')
        .populate('departurePhotos')
        .populate('installationPhotos')
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
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getVisitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('arrivalPhotos')
      .populate('departurePhotos')
      .populate('installationPhotos')
      .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } });

    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }
    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const advanceStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    const stepOrder = ['checkIn', 'arrivalPhotos', 'departurePhotos', 'complete'] as const;
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
    io.to(`visit:${visit._id}`).emit('visit-updated', { visitId: visit._id.toString(), visit });
    io.to('admin-dashboard').emit('visit-updated', { visitId: visit._id.toString(), visit });

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const approveStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    // External visits: only superadmin can approve
    if (visit.visitorType === 'external' && req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Only superadmin can approve external visitor requests' });
      return;
    }

    // Internal visits: only superadmin or matching department head can approve
    if (
      visit.visitorType !== 'external' &&
      req.admin?.role !== 'superadmin' &&
      req.admin?.department !== visit.department
    ) {
      res.status(403).json({ message: 'Not authorised to approve visits for this department' });
      return;
    }

    const currentStep = visit.currentStep;
    if (visit.steps[currentStep].status !== 'awaiting-approval') {
      res.status(400).json({ message: 'Step is not awaiting approval' });
      return;
    }

    visit.steps[currentStep].status = 'approved';
    visit.steps[currentStep].completedAt = new Date();
    visit.steps[currentStep].approvedBy = req.admin?.name ?? 'Admin';

    if (visit.visitorType === 'external') {
      // External: skip photo steps, jump straight to complete
      visit.steps.departurePhotos.status = 'approved';
      visit.steps.departurePhotos.completedAt = new Date();
      visit.steps.complete.status = 'completed';
      visit.steps.complete.completedAt = new Date();
      visit.currentStep = 'complete';
      visit.checkOutTime = new Date();
      visit.status = 'completed';
    } else {
      const stepOrder = ['checkIn', 'arrivalPhotos', 'departurePhotos', 'complete'] as const;
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
    }

    await visit.save();

    const populated = await Visit.findById(visit._id)
      .populate('arrivalPhotos')
      .populate('departurePhotos')
      .populate('installationPhotos')
      .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } });

    const io = getIO();
    io.to(`visit:${visit._id}`).emit('step-approved', { visitId: visit._id.toString(), step: currentStep });
    io.to('admin-dashboard').emit('visit-updated', { visitId: visit._id.toString(), visit: populated });

    // Notify external visitor via email
    if (visit.visitorType === 'external' && visit.contactEmail) {
      notifyExternalVisitor(visit.contactEmail, visit.technicianName, visit.siteName, 'approved')
        .catch(console.error);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const submitStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    const currentStep = visit.currentStep;
    if (!['arrivalPhotos', 'departurePhotos'].includes(currentStep)) {
      res.status(400).json({ message: 'Step cannot be submitted for approval' });
      return;
    }

    if (visit.steps[currentStep].status === 'awaiting-approval') {
      res.status(400).json({ message: 'Step is already awaiting approval' });
      return;
    }

    visit.steps[currentStep].status = 'awaiting-approval';
    visit.status = 'awaiting-approval';
    await visit.save();

    const io = getIO();
    io.to('admin-dashboard').emit('photos-uploaded', {
      visitId: visit._id.toString(),
      type: currentStep === 'arrivalPhotos' ? 'arrival' : 'departure',
      count: 0,
    });
    io.to(`visit:${visit._id}`).emit('visit-updated', { visitId: visit._id.toString(), visit });

    notifyDepartmentAndSuperadmins(
      visit.department || '',
      `Photos Ready for Review: ${visit.technicianName} at ${visit.siteName}`,
      `<h2>Photos Submitted for Review</h2><p><strong>${visit.technicianName}</strong> has submitted <strong>${currentStep === 'arrivalPhotos' ? 'arrival' : 'departure'}</strong> photos at <strong>${visit.siteName}</strong>.</p><p>Department: <strong>${visit.department || 'N/A'}</strong></p><p>Please log in to review and approve.</p>`
    ).catch(console.error);

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const declineStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    // External visits: only superadmin can decline
    if (visit.visitorType === 'external' && req.admin?.role !== 'superadmin') {
      res.status(403).json({ message: 'Only superadmin can decline external visitor requests' });
      return;
    }

    // Internal visits: only superadmin or matching department head can decline
    if (
      visit.visitorType !== 'external' &&
      req.admin?.role !== 'superadmin' &&
      req.admin?.department !== visit.department
    ) {
      res.status(403).json({ message: 'Not authorised to decline visits for this department' });
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

    const populated = await Visit.findById(visit._id)
      .populate('arrivalPhotos')
      .populate('departurePhotos')
      .populate('installationPhotos')
      .populate({ path: 'comments', populate: { path: 'admin', select: 'name' } });

    const io = getIO();
    io.to(`visit:${visit._id}`).emit('step-declined', { visitId: visit._id.toString(), step: currentStep, reason });
    io.to('admin-dashboard').emit('visit-updated', { visitId: visit._id.toString(), visit: populated });

    // Notify external visitor via email
    if (visit.visitorType === 'external' && visit.contactEmail) {
      notifyExternalVisitor(visit.contactEmail, visit.technicianName, visit.siteName, 'declined', reason)
        .catch(console.error);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
