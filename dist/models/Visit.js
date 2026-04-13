import mongoose, { Schema } from 'mongoose';
const stepStatusSchema = new Schema({
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'awaiting-approval', 'approved', 'declined', 'completed'],
        default: 'pending',
    },
    completedAt: { type: Date },
    declineReason: { type: String },
    approvedBy: { type: String },
}, { _id: false });
const visitSchema = new Schema({
    technicianName: { type: String, required: true, trim: true },
    siteName: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    visitorType: { type: String, enum: ['internal', 'external'], default: 'internal' },
    companyName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    gpsLocation: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String },
    },
    currentStep: {
        type: String,
        enum: ['checkIn', 'arrivalPhotos', 'departurePhotos', 'complete'],
        default: 'checkIn',
    },
    steps: {
        checkIn: { type: stepStatusSchema, default: () => ({ status: 'completed' }) },
        arrivalPhotos: { type: stepStatusSchema, default: () => ({ status: 'pending' }) },
        departurePhotos: { type: stepStatusSchema, default: () => ({ status: 'pending' }) },
        complete: { type: stepStatusSchema, default: () => ({ status: 'pending' }) },
    },
    // Legacy field — kept for backward compatibility
    installationTypes: { type: [String], default: [] },
    arrivalPhotos: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
    departurePhotos: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
    // Legacy field — kept for backward compatibility
    installationPhotos: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
    status: {
        type: String,
        enum: ['active', 'awaiting-approval', 'completed', 'declined'],
        default: 'active',
    },
}, { timestamps: true });
export default mongoose.model('Visit', visitSchema);
