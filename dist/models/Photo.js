import mongoose, { Schema } from 'mongoose';
const photoSchema = new Schema({
    visit: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: {
        type: String,
        enum: [
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
    uploadedAt: { type: Date, default: Date.now },
});
export default mongoose.model('Photo', photoSchema);
