import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import {
    sendPushNotifications,
    notifyAIMatch,
    notifyInvitation,
    notifySystem,
    isValidPushToken,
} from '../utils/expoPush';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// ── Validation ────────────────────────────────────────────────────────────────
export const sendNotificationValidation = [
    body('type')
        .isIn(['AI_MATCH', 'INVITATION', 'SYSTEM'])
        .withMessage('type must be AI_MATCH | INVITATION | SYSTEM'),
    body('recipientUserId')
        .optional()
        .isMongoId()
        .withMessage('recipientUserId must be a valid MongoDB ObjectId'),
    body('recipientUserIds')
        .optional()
        .isArray()
        .withMessage('recipientUserIds must be an array'),
    body('matchCount').optional().isInt({ min: 1 }),
    body('topMatchName').optional().isString().trim(),
    body('senderName').optional().isString().trim(),
    body('projectTitle').optional().isString().trim(),
    body('title').optional().isString().trim(),
    body('message').optional().isString().trim(),
];

/**
 * POST /api/notifications/send
 *
 * Sends a push notification to one or more users by userId.
 * The userId is resolved to an Expo push token stored on the User document.
 *
 * Three notification types:
 *   AI_MATCH    — notify the requesting user about AI-found teammates
 *   INVITATION  — notify the recipient user about an inbound intro
 *   SYSTEM      — generic broadcast (admin / server-side use)
 *
 * Example payloads — see route JSDoc below.
 */
export const sendNotification = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ success: false, errors: errors.array() });
        return;
    }

    const {
        type,
        recipientUserId,
        recipientUserIds,
        matchCount,
        topMatchName,
        senderName,
        projectTitle,
        title,
        message,
    } = req.body;

    try {
        switch (type) {

            // ── AI_MATCH: AI found teammates — notify the requesting user ───────────
            case 'AI_MATCH': {
                if (!recipientUserId) throw new AppError('recipientUserId is required for AI_MATCH', 422);

                const user = await User.findById(recipientUserId).select('pushToken').lean();
                if (!user?.pushToken || !isValidPushToken(user.pushToken)) {
                    res.json({ success: true, message: 'User has no valid push token registered', sent: 0 });
                    return;
                }

                const result = await notifyAIMatch(
                    user.pushToken,
                    matchCount ?? 1,
                    topMatchName ?? 'a great match',
                    projectTitle
                );

                res.json({ success: true, ...result });
                return;
            }

            // ── INVITATION: User received a collaboration intro ──────────────────────
            case 'INVITATION': {
                if (!recipientUserId) throw new AppError('recipientUserId is required for INVITATION', 422);

                const user = await User.findById(recipientUserId).select('pushToken').lean();
                if (!user?.pushToken || !isValidPushToken(user.pushToken)) {
                    res.json({ success: true, message: 'Recipient has no valid push token registered', sent: 0 });
                    return;
                }

                const result = await notifyInvitation(
                    user.pushToken,
                    senderName ?? 'A teammate',
                    projectTitle
                );

                res.json({ success: true, ...result });
                return;
            }

            // ── SYSTEM: Broadcast to multiple users ─────────────────────────────────
            case 'SYSTEM': {
                const ids: string[] = recipientUserIds ?? [];
                if (ids.length === 0) throw new AppError('recipientUserIds is required for SYSTEM type', 422);
                if (!title || !message) throw new AppError('title and message are required for SYSTEM type', 422);

                // Batch-fetch push tokens
                const users = await User.find({ _id: { $in: ids } }).select('pushToken').lean();
                const tokens = users
                    .map((u) => u.pushToken as string)
                    .filter((t): t is string => !!t && isValidPushToken(t));

                if (tokens.length === 0) {
                    res.json({ success: true, message: 'No valid push tokens found', sent: 0 });
                    return;
                }

                const result = await notifySystem(tokens, title, message, { type: 'SYSTEM' });
                res.json({ success: true, ...result });
                return;
            }

            default:
                throw new AppError('Invalid notification type', 422);
        }
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/notifications/test
 * Quick smoke-test: sends a push to the currently authenticated user.
 */
export const sendTestNotification = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await User.findById(req.user!._id).select('pushToken name').lean();
        if (!user?.pushToken) {
            res.status(400).json({ success: false, message: 'No push token found. Open the mobile app first.' });
            return;
        }

        const result = await sendPushNotifications([{
            to: user.pushToken,
            title: '🎉 TeamForge Push Test',
            body: `Hi ${user.name}! Push notifications are working perfectly.`,
            data: { type: 'TEST' },
            sound: 'default',
        }]);

        res.json({ success: true, message: 'Test notification sent', ...result });
    } catch (err) {
        next(err);
    }
};
