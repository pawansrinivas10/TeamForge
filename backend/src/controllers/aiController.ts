import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { runBoundedAgent } from '../agent/boundedAgent';
import { runOpenAIAgent } from '../agent/openaiAgent';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import {
    notifyAIMatch,
    notifyInvitation,
    isValidPushToken,
} from '../utils/expoPush';

// ─── Validation ───────────────────────────────────────────────────────────────
export const agentValidation = [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('projectId').optional().isMongoId().withMessage('Invalid projectId'),
    body('approvedMessageTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid approvedMessageTo userId'),
];

// ── Fire-and-forget push helper (never blocks the API response) ───────────────
const firePush = (fn: () => Promise<unknown>): void => {
    fn().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[Push] Background notification failed:', msg);
    });
};

/**
 * POST /api/ai/match
 *
 * ── Push notification triggers ────────────────────────────────────────────────
 *
 *   1. AI_MATCH — After successful match (matches.length > 0):
 *      Notifies the REQUESTING user about the top teammate found.
 *      Fired fire-and-forget so it never delays the API response.
 *
 *   2. INVITATION — After draft_intro_message is produced (draftMessage ≠ null):
 *      Notifies the RECIPIENT user that someone sent them an intro.
 *      Only fires if the recipient has a valid push token on their profile.
 */
export const aiMatch = async (
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
        const { message, projectId, approvedMessageTo } = req.body;
        const userId = req.user!._id.toString();

        const useOpenAI = process.env.USE_OPENAI_AGENT === 'true';

        let result;

        if (useOpenAI) {
            if (!process.env.OPENAI_API_KEY) {
                res.status(503).json({
                    success: false,
                    message: 'OpenAI agent is enabled (USE_OPENAI_AGENT=true) but OPENAI_API_KEY is not set.',
                });
                return;
            }
            result = await runOpenAIAgent({ message, userId, projectId });
        } else {
            result = await runBoundedAgent({ message, userId, projectId, approvedMessageTo });
        }

        // ── Trigger 1: AI_MATCH — notify requesting user about found teammates ────
        if (result.success && result.matches && result.matches.length > 0) {
            const topMatch = result.matches[0];
            firePush(async () => {
                const requestingUser = await User.findById(userId).select('pushToken').lean();
                if (requestingUser?.pushToken && isValidPushToken(requestingUser.pushToken)) {
                    await notifyAIMatch(
                        requestingUser.pushToken,
                        result.matches!.length,
                        topMatch.name,
                        projectId ? undefined : undefined  // projectTitle resolved if needed
                    );
                }
            });
        }

        // ── Trigger 2: INVITATION — notify recipient when intro draft is ready ────
        if (result.success && result.draftMessage) {
            const { recipientId, recipientName, senderName, projectTitle } = result.draftMessage as {
                recipientId: string;
                recipientName: string;
                senderName: string;
                projectTitle?: string;
            };

            firePush(async () => {
                const recipientUser = await User.findById(recipientId).select('pushToken').lean();
                if (recipientUser?.pushToken && isValidPushToken(recipientUser.pushToken)) {
                    await notifyInvitation(recipientUser.pushToken, senderName, projectTitle);
                }
            });
        }

        const statusCode = result.success ? 200 : 422;
        res.status(statusCode).json({
            ...result,
            agentMode: useOpenAI ? 'openai-gpt4o' : 'rule-based',
        });
    } catch (error) {
        next(error);
    }
};
