import Comment from '../models/Comment.js';
import Visit from '../models/Visit.js';
import { getIO } from '../config/socket.js';
export const addComment = async (req, res) => {
    try {
        const { visitId } = req.params;
        const { text, step } = req.body;
        const visit = await Visit.findById(visitId);
        if (!visit) {
            res.status(404).json({ message: 'Visit not found' });
            return;
        }
        const comment = await Comment.create({
            visit: visitId,
            admin: req.admin._id,
            text,
            step: step || visit.currentStep,
        });
        visit.comments.push(comment._id);
        await visit.save();
        const populated = await Comment.findById(comment._id).populate('admin', 'name');
        const io = getIO();
        io.to(`visit:${visitId}`).emit('new-comment', {
            visitId,
            comment: populated,
        });
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ visit: req.params.visitId })
            .populate('admin', 'name')
            .sort({ createdAt: -1 });
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
