import Photo from '../models/Photo.js';
import Visit from '../models/Visit.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';
import { getIO } from '../config/socket.js';
import { notifyAdmins } from '../utils/sendEmail.js';
const NEW_ARRIVAL_TYPES = ['outdoor-arrival', 'power-arrival', 'rack-arrival'];
const NEW_DEPARTURE_TYPES = ['outdoor-departure', 'power-departure', 'rack-departure'];
const LEGACY_INSTALLATION_TYPES = [
    'radio-installation', 'poe-installation', 'poe-uplink',
    'radio-installation-dep', 'poe-installation-dep', 'poe-uplink-dep',
];
export const uploadPhotos = async (req, res) => {
    try {
        const { visitId } = req.params;
        const files = req.files;
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
        const requestedType = req.body.photoType;
        const caption = req.body.caption;
        // Determine type and which array to push into
        const isNewArrival = requestedType && NEW_ARRIVAL_TYPES.includes(requestedType);
        const isNewDeparture = requestedType && NEW_DEPARTURE_TYPES.includes(requestedType);
        const isLegacyInstallation = requestedType && LEGACY_INSTALLATION_TYPES.includes(requestedType);
        const type = requestedType || (visit.currentStep === 'arrivalPhotos' ? 'arrival' : 'departure');
        const uploadResults = await Promise.all(files.map((file) => uploadToCloudinary(file.buffer, `${type}/${visitId}`)));
        const photos = await Photo.insertMany(uploadResults.map((result) => ({
            visit: visitId,
            url: result.url,
            publicId: result.publicId,
            type,
            ...(caption ? { caption } : {}),
        })));
        const photoIds = photos.map((p) => p._id);
        if (isNewArrival) {
            // New workflow: no auto-submit — frontend calls submit-step when all 3 sections done
            visit.arrivalPhotos.push(...photoIds);
        }
        else if (isNewDeparture) {
            // New workflow: no auto-submit
            visit.departurePhotos.push(...photoIds);
        }
        else if (isLegacyInstallation) {
            // Legacy: installation photos
            visit.installationPhotos.push(...photoIds);
        }
        else if (type === 'arrival') {
            // Legacy: auto-submit if no installation types
            visit.arrivalPhotos.push(...photoIds);
            if (!visit.installationTypes || visit.installationTypes.length === 0) {
                visit.steps[visit.currentStep].status = 'awaiting-approval';
                visit.status = 'awaiting-approval';
            }
        }
        else {
            // Legacy departure: auto-submit if no installation types
            visit.departurePhotos.push(...photoIds);
            if (!visit.installationTypes || visit.installationTypes.length === 0) {
                visit.steps[visit.currentStep].status = 'awaiting-approval';
                visit.status = 'awaiting-approval';
            }
        }
        await visit.save();
        const io = getIO();
        io.to(`visit:${visitId}`).emit('visit-updated', { visitId, visit });
        // Notify admin only for legacy auto-submit
        if ((type === 'arrival' || type === 'departure') && !isNewArrival && !isNewDeparture &&
            (!visit.installationTypes || visit.installationTypes.length === 0)) {
            io.to('admin-dashboard').emit('photos-uploaded', { visitId, type, count: photos.length });
            notifyAdmins(`Photos Uploaded: ${visit.technicianName} — ${type}`, `<h2>Photos Uploaded</h2><p><strong>${visit.technicianName}</strong> uploaded ${photos.length} ${type} photos at <strong>${visit.siteName}</strong>.</p>`).catch(console.error);
        }
        res.status(201).json(photos);
    }
    catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ message: error.message });
    }
};
export const deletePhoto = async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.photoId);
        if (!photo) {
            res.status(404).json({ message: 'Photo not found' });
            return;
        }
        await deleteFromCloudinary(photo.publicId);
        const visit = await Visit.findById(photo.visit);
        if (visit) {
            const isArrivalType = [...NEW_ARRIVAL_TYPES, 'arrival'].includes(photo.type);
            const isDepartureType = [...NEW_DEPARTURE_TYPES, 'departure'].includes(photo.type);
            if (isArrivalType) {
                visit.arrivalPhotos = visit.arrivalPhotos.filter((id) => id.toString() !== photo._id.toString());
            }
            else if (isDepartureType) {
                visit.departurePhotos = visit.departurePhotos.filter((id) => id.toString() !== photo._id.toString());
            }
            else {
                visit.installationPhotos = visit.installationPhotos.filter((id) => id.toString() !== photo._id.toString());
            }
            await visit.save();
        }
        await Photo.findByIdAndDelete(photo._id);
        res.json({ message: 'Photo deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
