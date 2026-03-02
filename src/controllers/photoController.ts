import type { Request, Response } from 'express';
import Photo from '../models/Photo.js';
import Visit from '../models/Visit.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';
import { getIO } from '../config/socket.js';
import { notifyAdmins } from '../utils/sendEmail.js';

export const uploadPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { visitId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length < 3) {
      res.status(400).json({ message: 'Minimum 3 photos required' });
      return;
    }
    if (files.length > 10) {
      res.status(400).json({ message: 'Maximum 10 photos allowed' });
      return;
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    // Determine photo type: explicit from body, or derived from current step
    const installationPhotoTypes = [
      'radio-installation',
      'poe-installation',
      'poe-uplink',
      'radio-installation-dep',
      'poe-installation-dep',
      'poe-uplink-dep',
    ];
    const requestedType = req.body.photoType as string | undefined;
    const isInstallationPhoto = requestedType && installationPhotoTypes.includes(requestedType);
    const type = isInstallationPhoto
      ? requestedType
      : visit.currentStep === 'arrivalPhotos'
        ? 'arrival'
        : 'departure';

    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.buffer, `${type}/${visitId}`)
    );
    const uploadResults = await Promise.all(uploadPromises);

    const photos = await Photo.insertMany(
      uploadResults.map((result) => ({
        visit: visitId,
        url: result.url,
        publicId: result.publicId,
        type,
      }))
    );

    const photoIds = photos.map((p) => p._id);
    if (isInstallationPhoto) {
      visit.installationPhotos.push(...photoIds);
      // Installation photos don't trigger awaiting-approval — frontend calls submit-step
    } else if (type === 'arrival') {
      visit.arrivalPhotos.push(...photoIds);
      // If visit has no installation types, auto-submit (backward-compatible behaviour)
      if (!visit.installationTypes || visit.installationTypes.length === 0) {
        visit.steps[visit.currentStep].status = 'awaiting-approval';
        visit.status = 'awaiting-approval';
      }
    } else {
      visit.departurePhotos.push(...photoIds);
      // If visit has no installation types, auto-submit
      if (!visit.installationTypes || visit.installationTypes.length === 0) {
        visit.steps[visit.currentStep].status = 'awaiting-approval';
        visit.status = 'awaiting-approval';
      }
    }

    await visit.save();

    const io = getIO();
    if (!isInstallationPhoto) {
      io.to('admin-dashboard').emit('photos-uploaded', {
        visitId,
        type: type as 'arrival' | 'departure',
        count: photos.length,
      });
    }
    io.to(`visit:${visitId}`).emit('visit-updated', {
      visitId,
      visit,
    });

    if (!isInstallationPhoto && (!visit.installationTypes || visit.installationTypes.length === 0)) {
      notifyAdmins(
        `Photos Uploaded: ${visit.technicianName} - ${type} photos`,
        `<h2>Photos Uploaded</h2><p><strong>${visit.technicianName}</strong> uploaded ${photos.length} ${type} photos at <strong>${visit.siteName}</strong></p><p>Please review and approve.</p>`
      ).catch(console.error);
    }

    res.status(201).json(photos);
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deletePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ message: 'Photo not found' });
      return;
    }

    await deleteFromCloudinary(photo.publicId);

    const visit = await Visit.findById(photo.visit);
    if (visit) {
      if (photo.type === 'arrival') {
        visit.arrivalPhotos = visit.arrivalPhotos.filter((id) => id.toString() !== photo._id.toString());
      } else if (photo.type === 'departure') {
        visit.departurePhotos = visit.departurePhotos.filter((id) => id.toString() !== photo._id.toString());
      } else {
        visit.installationPhotos = visit.installationPhotos.filter((id) => id.toString() !== photo._id.toString());
      }
      await visit.save();
    }

    await Photo.findByIdAndDelete(photo._id);
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
