import mongoose, { Schema } from 'mongoose';
const commentSchema = new Schema({
    visit: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    text: { type: String, required: true, trim: true },
    step: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
export default mongoose.model('Comment', commentSchema);
