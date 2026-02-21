import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
    sendNotification,
    sendNotificationValidation,
    sendTestNotification,
} from '../controllers/notificationsController';

const router = Router();

/**
 * POST /api/notifications/send
 *
 * Send a push notification to one or more TeamForge users.
 * The server resolves userId → Expo push token internally.
 *
 * ── Example payloads ────────────────────────────────────────────
 *
 * AI_MATCH (AI found teammates for the requesting user):
 * {
 *   "type": "AI_MATCH",
 *   "recipientUserId": "64abc...",
 *   "matchCount": 3,
 *   "topMatchName": "Alice Chen",
 *   "projectTitle": "AI Task Manager"   ← optional
 * }
 *
 * INVITATION (user received a collaboration intro):
 * {
 *   "type": "INVITATION",
 *   "recipientUserId": "64def...",
 *   "senderName": "Bob Smith",
 *   "projectTitle": "Blockchain App"    ← optional
 * }
 *
 * SYSTEM (broadcast to multiple users):
 * {
 *   "type": "SYSTEM",
 *   "recipientUserIds": ["64abc...", "64def..."],
 *   "title": "Platform Update",
 *   "message": "New AI matching features are now live!"
 * }
 */
router.post('/send', protect, sendNotificationValidation, sendNotification);

/**
 * GET /api/notifications/test
 * Sends a test push to the currently authenticated user's device.
 * Useful for verifying the push pipeline end-to-end.
 */
router.get('/test', protect, sendTestNotification);

export default router;
