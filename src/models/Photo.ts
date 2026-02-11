import mongoose, { Schema } from 'mongoose';
import type { IPhoto } from '../types/index.js';

const photoSchema = new Schema<IPhoto>({
  visit: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: { type: String, enum: ['arrival', 'departure'], required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPhoto>('Photo', photoSchema);
