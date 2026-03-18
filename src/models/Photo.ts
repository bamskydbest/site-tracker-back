import mongoose, { Schema } from 'mongoose';
import type { IPhoto } from '../types/index.js';

const photoSchema = new Schema<IPhoto>({
  visit: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: {
    type: String,
    enum: [
      // New types
      'outdoor-arrival',
      'power-arrival',
      'rack-arrival',
      'outdoor-departure',
      'power-departure',
      'rack-departure',
      // Legacy types (backward compatibility)
      'arrival',
      'departure',
      'radio-installation',
      'poe-installation',
      'poe-uplink',
      'radio-installation-dep',
      'poe-installation-dep',
      'poe-uplink-dep',
    ],
    required: true,
  },
  caption: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPhoto>('Photo', photoSchema);
