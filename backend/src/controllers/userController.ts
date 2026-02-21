import { Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// ─── GET /api/users — Query all users (with skill filter) ─────────────────────
export const getUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { skills, availability, page = '1', limit = '20' } = req.query as Record<string, string>;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const filter: Record<string, unknown> = {};

        if (skills) {
            const skillList = skills.split(',').map((s) => s.trim());
            filter.skills = { $in: skillList };
        }

        if (availability) {
            filter.availability = availability;
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            User.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            users,
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/users/me — Get current user profile ────────────────────────────
export const getMyProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        res.status(200).json({ success: true, user: req.user });
    } catch (error) {
        next(error);
    }
};

// ─── Validation for profile update ───────────────────────────────────────────
export const updateProfileValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 60 }),
    body('bio').optional().isLength({ max: 500 }),
    body('skills').optional().isArray(),
    body('availability').optional().isIn(['available', 'busy', 'part-time']),
];

// ─── PATCH /api/users/me — Update current user profile ───────────────────────
export const updateMyProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ success: false, errors: errors.array() });
        return;
    }

    try {
        const allowedFields = ['name', 'bio', 'skills', 'availability', 'avatar'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user!._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) throw new AppError('User not found', 404);

        res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/users/push-token — Save Expo push token ──────────────────────
export const savePushToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { pushToken } = req.body;
        if (!pushToken || typeof pushToken !== 'string') {
            throw new AppError('pushToken is required', 400);
        }

        await User.findByIdAndUpdate(req.user!._id, { pushToken });
        res.status(200).json({ success: true, message: 'Push token saved.' });
    } catch (error) {
        next(error);
    }
};
