import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './systemPrompt';
import { TOOL_DEFINITIONS } from './toolDefinitions';
import {
    matchUsersBySkills,
    MatchedUser,
    MatchUsersOutput,
} from './tools/matchUsersBySkills';
import {
    draftIntroMessage,
    DraftIntroOutput,
} from './tools/draftIntroMessage';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_TOOL_CALLS = 2;
const OPENAI_TIMEOUT_MS = 30_000;

// ─── Availability union (mirrors the User model) ─────────────────────────────
type AvailabilityFilter = 'available' | 'busy' | 'part-time';
const VALID_AVAILABILITY: AvailabilityFilter[] = ['available', 'busy', 'part-time'];
const toAvailabilityFilter = (raw: unknown): AvailabilityFilter | undefined => {
    if (typeof raw === 'string' && (VALID_AVAILABILITY as string[]).includes(raw)) {
        return raw as AvailabilityFilter;
    }
    return undefined;
};

// ─── Type guard: ensure tool_call has a `.function` property ─────────────────
// The OpenAI SDK union includes ChatCompletionMessageCustomToolCall which
// does NOT have `.function`, so we must narrow before accessing it.
interface FunctionToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}
const isFunctionToolCall = (
    tc: OpenAI.Chat.ChatCompletionMessageToolCall
): tc is FunctionToolCall => tc.type === 'function';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AgentRequest {
    message: string;
    userId: string;
    projectId?: string;
}

export interface AgentResponse {
    success: boolean;
    reasoning: string;
    toolCallsMade: number;
    matches: MatchedUser[] | null;
    draftMessage: DraftIntroOutput | null;
    awaitingApproval: boolean;
    approvalPrompt: string | null;
    error: string | null;
}

// ─── Safe JSON parse with fallback ──────────────────────────────────────────
const safeParseJSON = <T>(raw: string | null, fallback: T): T => {
    try {
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

// ─── Validate to_user_id exists in matches (anti-hallucination) ───────────
const validateRecipientId = (
    toUserId: string,
    confirmedMatches: MatchedUser[]
): boolean => confirmedMatches.some((u) => u.userId === toUserId);

// ─── OpenAI client factory ───────────────────────────────────────────────────
const getOpenAIClient = (): OpenAI => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set in environment variables.');
    return new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS });
};

// ─── Tool Dispatcher ─────────────────────────────────────────────────────────
const dispatchTool = async (
    toolName: string,
    args: Record<string, unknown>,
    context: { userId: string; projectId?: string; confirmedMatches: MatchedUser[] }
): Promise<{ result: unknown; error?: string }> => {
    switch (toolName) {
        case 'match_users_by_skills': {
            const skills = args.skills as string[];
            if (!Array.isArray(skills) || skills.length === 0) {
                return { result: null, error: 'match_users_by_skills: skills must be a non-empty array' };
            }
            const result = await matchUsersBySkills({
                skills,
                limit: (args.limit as number) ?? 5,
                availabilityFilter: toAvailabilityFilter(args.availability_filter),
                excludeUserId: context.userId,
            });
            return { result };
        }

        case 'draft_intro_message': {
            const toUserId = args.to_user_id as string;

            // ── Anti-hallucination guard ──────────────────────────────────────────
            if (!validateRecipientId(toUserId, context.confirmedMatches)) {
                return {
                    result: null,
                    error:
                        `draft_intro_message: to_user_id "${toUserId}" was not returned by ` +
                        `match_users_by_skills. Cannot draft a message to an unverified user.`,
                };
            }

            const result = await draftIntroMessage({
                fromUserId: context.userId,
                toUserId,
                projectId: (args.project_id as string) ?? context.projectId,
                customNote: args.custom_note as string | undefined,
            });
            return { result };
        }

        default:
            return { result: null, error: `Unknown tool: ${toolName}` };
    }
};

// ─── Main OpenAI Agentic Loop ─────────────────────────────────────────────────
export const runOpenAIAgent = async (req: AgentRequest): Promise<AgentResponse> => {
    const openai = getOpenAIClient();

    let toolCallsMade = 0;
    const confirmedMatches: MatchedUser[] = [];
    let draftMessage: DraftIntroOutput | null = null;
    let finalMatches: MatchedUser[] | null = null;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: req.message },
    ];

    const fallbackError = (error: string): AgentResponse => ({
        success: false,
        reasoning: 'An error occurred during agent execution.',
        toolCallsMade,
        matches: finalMatches,
        draftMessage: null,
        awaitingApproval: false,
        approvalPrompt: null,
        error,
    });

    try {
        // ── Agentic loop: up to 2 LLM turns, each may invoke 1 tool ─────────────
        for (let turn = 0; turn < 2; turn++) {
            if (toolCallsMade >= MAX_TOOL_CALLS) break;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages,
                tools: TOOL_DEFINITIONS,
                tool_choice: 'auto',
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 1500,
            });

            const assistantMessage = completion.choices[0].message;
            messages.push(assistantMessage);

            // No tool call requested → model is done deliberating this turn
            if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                break;
            }

            // ── Process tool calls (honour hard cap at MAX_TOOL_CALLS) ────────────
            for (const toolCall of assistantMessage.tool_calls) {
                // Skip non-function tool calls (e.g. custom tool types in future SDK versions)
                if (!isFunctionToolCall(toolCall)) continue;

                if (toolCallsMade >= MAX_TOOL_CALLS) {
                    // Inject cap-exceeded signal back into the conversation
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({
                            error: `[BoundedAgent] Tool call limit of ${MAX_TOOL_CALLS} reached. No further tool calls permitted this turn.`,
                        }),
                    });
                    break;
                }

                const args = safeParseJSON<Record<string, unknown>>(
                    toolCall.function.arguments,
                    {}
                );

                const { result, error } = await dispatchTool(
                    toolCall.function.name,
                    args,
                    { userId: req.userId, projectId: req.projectId, confirmedMatches }
                );

                toolCallsMade++;

                if (error) {
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error }),
                    });
                    continue;
                }

                // Capture verified matches for anti-hallucination guard
                if (toolCall.function.name === 'match_users_by_skills') {
                    const matchOutput = result as MatchUsersOutput;
                    confirmedMatches.push(...matchOutput.matches);
                    finalMatches = matchOutput.matches;
                }

                if (toolCall.function.name === 'draft_intro_message') {
                    draftMessage = result as DraftIntroOutput;
                }

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
        }

        // ── Request final structured JSON summary ─────────────────────────────────
        const summaryCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                ...messages,
                {
                    role: 'user',
                    content:
                        'Now produce the final AgentResponse JSON. ' +
                        'Set awaitingApproval=true if matches were found but no draft was produced yet. ' +
                        'Include an approvalPrompt asking the user which user they want to message.',
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 1200,
        });

        const raw = summaryCompletion.choices[0].message.content ?? '{}';
        const parsed = safeParseJSON<Partial<AgentResponse>>(raw, {});

        return {
            success: true,
            reasoning: parsed.reasoning ?? 'Agent completed.',
            toolCallsMade,
            matches: finalMatches,
            draftMessage,
            awaitingApproval: parsed.awaitingApproval ?? false,
            approvalPrompt: parsed.approvalPrompt ?? null,
            error: null,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return fallbackError(message);
    }
};
