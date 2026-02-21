/**
 * TeamForge — Expo Push Notification Utility
 *
 * Uses expo-server-sdk to send notifications to devices registered
 * with the Expo push service. Handles token validation, batching,
 * error classification, and receipt checking.
 *
 * ── Two notification triggers ───────────────────────────────────────────────
 *   1. notifyAIMatch       — AI found relevant teammates for a project
 *   2. notifyInvitation    — A user sent you an introduction / invitation
 *
 * ── Expo push flow (backend side) ───────────────────────────────────────────
 *   sendPushNotifications(messages)
 *     → expo.sendPushNotificationsAsync()  [batched, max 100/req]
 *     → returns { tickets }
 *   After 15–30 min (or immediately for errors):
 *   checkPushReceipts(tickets)
 *     → expo.getPushNotificationReceiptsAsync()
 *     → logs/handles errors per device
 */

import Expo, { ExpoPushMessage, ExpoPushTicket, ExpoPushSuccessTicket } from 'expo-server-sdk';

// Singleton Expo client
let _expo: Expo | null = null;
const getExpo = (): Expo => {
    if (!_expo) _expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    return _expo;
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type PushResult = {
    sent: number;
    failed: number;
    tickets: ExpoPushTicket[];
};

// ── Token validator ───────────────────────────────────────────────────────────
export const isValidPushToken = (token: string): boolean =>
    Expo.isExpoPushToken(token);

// ── Low-level: send a batch of messages ───────────────────────────────────────
export const sendPushNotifications = async (
    messages: ExpoPushMessage[]
): Promise<PushResult> => {
    const expo = getExpo();

    // Filter out invalid tokens before sending
    const valid = messages.filter(
        (msg) => typeof msg.to === 'string' && isValidPushToken(msg.to as string)
    );

    if (valid.length === 0) {
        return { sent: 0, failed: messages.length, tickets: [] };
    }

    const chunks = expo.chunkPushNotifications(valid);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
    }

    const failed = tickets.filter((t) => t.status === 'error').length;
    return { sent: tickets.length - failed, failed, tickets };
};

// ── Receipt checker (run ~30 min after send for production reliability) ────────
export const checkPushReceipts = async (
    tickets: ExpoPushTicket[]
): Promise<void> => {
    const expo = getExpo();

    const receiptIds = (tickets as ExpoPushSuccessTicket[])
        .filter((t): t is ExpoPushSuccessTicket => t.status === 'ok' && !!t.id)
        .map((t) => t.id);

    if (receiptIds.length === 0) return;

    const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of chunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const [id, receipt] of Object.entries(receipts)) {
            if (receipt.status === 'error') {
                console.error(`[Push] Receipt error for id ${id}:`, receipt.message);
                // DeviceNotRegistered — remove token from DB
                if (receipt.details?.error === 'DeviceNotRegistered') {
                    console.warn(`[Push] Token ${id} is no longer registered — should be removed from DB.`);
                }
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-LEVEL TRIGGER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger 1: AI has recommended teammates for a project.
 *
 * Sends a notification to the REQUESTING user summarising top matches.
 *
 * @param recipientToken  Expo push token of the user who ran the AI match
 * @param matchCount      Number of users found
 * @param topMatchName    Name of the best-scored match
 * @param projectTitle    Optional project context
 */
export const notifyAIMatch = async (
    recipientToken: string,
    matchCount: number,
    topMatchName: string,
    projectTitle?: string
): Promise<PushResult> => {
    const projectCtx = projectTitle ? ` for "${projectTitle}"` : '';

    return sendPushNotifications([
        {
            to: recipientToken,
            title: '🤖 AI Found Teammates!',
            body: `Found ${matchCount} match${matchCount !== 1 ? 'es' : ''}${projectCtx}. Top pick: ${topMatchName}`,
            data: { type: 'AI_MATCH', matchCount, topMatchName, projectTitle },
            sound: 'default',
            badge: 1,
            channelId: 'teamforge',
            priority: 'high',
        },
    ]);
};

/**
 * Trigger 2: A user has received a collaboration invitation.
 *
 * Sends a notification to the RECIPIENT of the drafted introduction.
 *
 * @param recipientToken  Expo push token of the message recipient
 * @param senderName      Name of the user who sent the intro
 * @param projectTitle    Optional project context
 */
export const notifyInvitation = async (
    recipientToken: string,
    senderName: string,
    projectTitle?: string
): Promise<PushResult> => {
    const body = projectTitle
        ? `${senderName} invited you to collaborate on "${projectTitle}"`
        : `${senderName} sent you a collaboration invitation`;

    return sendPushNotifications([
        {
            to: recipientToken,
            title: '✉️ New Collaboration Invite',
            body,
            data: { type: 'INVITATION', senderName, projectTitle },
            sound: 'default',
            badge: 1,
            channelId: 'teamforge',
            priority: 'high',
        },
    ]);
};

/**
 * Trigger 3: Generic system notification (extensible for future use).
 */
export const notifySystem = async (
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, unknown> = {}
): Promise<PushResult> => {
    const messages: ExpoPushMessage[] = tokens.map((to) => ({
        to, title, body, data,
        sound: 'default',
        channelId: 'teamforge',
    }));
    return sendPushNotifications(messages);
};
