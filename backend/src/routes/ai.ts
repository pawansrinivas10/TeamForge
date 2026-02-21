import { Router } from 'express';
import { aiMatch, agentValidation } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(protect);

/**
 * POST /api/ai/match
 *
 * Body:
 *   message          (string, required) — User's natural language request
 *   projectId        (string, optional) — Context project ID
 *   approvedMessageTo (string, optional) — userId to draft intro to (triggers tool call 2)
 *
 * Response: AgentOutput (see boundedAgent.ts)
 *   {
 *     success, reasoning, toolCallsMade,
 *     matches, draftMessage,
 *     awaitingApproval, approvalPrompt,
 *     toolCallLog
 *   }
 */
router.post('/match', agentValidation, aiMatch);

export default router;
