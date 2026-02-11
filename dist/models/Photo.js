import mongoose, { Schema } from 'mongoose';
const photoSchema = new Schema({
    visit: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: { type: String, enum: ['arrival', 'departure'], required: true },
    uploadedAt: { type: Date, default: Date.now },
});
export default mongoose.model('Photo', photoSchema);
