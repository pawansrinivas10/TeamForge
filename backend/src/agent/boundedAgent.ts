import {
    matchUsersBySkills,
    MatchUsersInput,
    MatchUsersOutput,
} from './tools/matchUsersBySkills';
import {
    draftIntroMessage,
    DraftIntroInput,
    DraftIntroOutput,
} from './tools/draftIntroMessage';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_TOOL_CALLS = 2;

// ─── Tool Registry ────────────────────────────────────────────────────────────
const AVAILABLE_TOOLS = ['match_users_by_skills', 'draft_intro_message'] as const;
type ToolName = typeof AVAILABLE_TOOLS[number];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AgentInput {
    message: string;
    userId: string;
    projectId?: string;
    /** If true, user has approved sending the intro message */
    approvedMessageTo?: string;
}

export interface ToolCall {
    tool: ToolName;
    input: Record<string, unknown>;
    output: MatchUsersOutput | DraftIntroOutput;
    executedAt: string;
}

export interface AgentOutput {
    success: boolean;
    reasoning: string;
    toolCallsMade: number;
    matches?: MatchUsersOutput['matches'];
    draftMessage?: DraftIntroOutput | null;
    awaitingApproval: boolean;
    approvalPrompt?: string;
    toolCallLog: ToolCall[];
    error?: string;
}

// ─── Skill Extractor ─────────────────────────────────────────────────────────
// A simple rule-based NLP extractor — no LLM dependency required
const KNOWN_SKILLS = [
    'react', 'react native', 'node', 'nodejs', 'express', 'typescript', 'javascript',
    'python', 'django', 'flask', 'fastapi', 'mongodb', 'postgresql', 'mysql', 'redis',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'graphql', 'rest', 'figma',
    'flutter', 'swift', 'kotlin', 'java', 'c++', 'rust', 'go', 'vue', 'angular',
    'svelte', 'next', 'nextjs', 'tailwind', 'css', 'html', 'ui', 'ux', 'devops',
    'machine learning', 'ml', 'ai', 'data science', 'tensorflow', 'pytorch',
];

const extractSkillsFromMessage = (message: string): string[] => {
    const lower = message.toLowerCase();
    return KNOWN_SKILLS.filter((skill) => lower.includes(skill));
};

const buildReasoning = (message: string, skillsFound: string[]): string => {
    if (skillsFound.length === 0) {
        return `I analyzed your request: "${message}". I couldn't detect specific skills to search for. Please mention skills like "React developer" or "Python engineer".`;
    }
    return (
        `I analyzed your request and identified these skills to match: [${skillsFound.join(', ')}]. ` +
        `I will now search our user database for people with these skills, ranked by how many of the requested skills they possess.`
    );
};

// ─── Bounded Agent Core Loop ──────────────────────────────────────────────────
export const runBoundedAgent = async (input: AgentInput): Promise<AgentOutput> => {
    const { message, userId, projectId, approvedMessageTo } = input;

    let toolCallsMade = 0;
    const toolCallLog: ToolCall[] = [];

    const executeToolCall = async <T extends MatchUsersOutput | DraftIntroOutput>(
        tool: ToolName,
        toolInput: Record<string, unknown>
    ): Promise<T> => {
        // ── Hard cap enforcement ─────────────────────────────────────────────────
        if (toolCallsMade >= MAX_TOOL_CALLS) {
            throw new Error(
                `[BoundedAgent] Tool call limit exceeded. Max allowed: ${MAX_TOOL_CALLS}. ` +
                `This agent is intentionally bounded to ensure predictable behavior.`
            );
        }
        toolCallsMade++;

        let output: MatchUsersOutput | DraftIntroOutput;

        switch (tool) {
            case 'match_users_by_skills':
                output = await matchUsersBySkills(toolInput as unknown as MatchUsersInput);
                break;
            case 'draft_intro_message':
                output = await draftIntroMessage(toolInput as unknown as DraftIntroInput);
                break;
            default:
                throw new Error(`[BoundedAgent] Unknown tool: ${tool}`);
        }

        toolCallLog.push({ tool, input: toolInput, output, executedAt: new Date().toISOString() });
        return output as T;
    };

    try {
        // ── Path A: User approved sending an intro → Tool Call 1 (only) ──────────
        // In this case, we skip match and go straight to drafting the approved message
        if (approvedMessageTo) {
            const reasoning = `You approved sending an introduction to this user. I will now draft a professional intro message on your behalf for project context.`;

            const draft = await executeToolCall<DraftIntroOutput>('draft_intro_message', {
                fromUserId: userId,
                toUserId: approvedMessageTo,
                projectId,
            });

            return {
                success: true,
                reasoning,
                toolCallsMade,
                draftMessage: draft,
                awaitingApproval: false,
                toolCallLog,
            };
        }

        // ── Path B: New query → Tool Call 1: match_users_by_skills ────────────────
        const extractedSkills = extractSkillsFromMessage(message);
        const reasoning = buildReasoning(message, extractedSkills);

        if (extractedSkills.length === 0) {
            return {
                success: false,
                reasoning,
                toolCallsMade: 0,
                awaitingApproval: false,
                toolCallLog,
                error: 'No recognizable skills found in your message.',
            };
        }

        const matchResult = await executeToolCall<MatchUsersOutput>('match_users_by_skills', {
            skills: extractedSkills,
            limit: 5,
            excludeUserId: userId,
        });

        if (matchResult.matches.length === 0) {
            return {
                success: true,
                reasoning: reasoning + ' However, no users were found matching these skills.',
                toolCallsMade,
                matches: [],
                awaitingApproval: false,
                toolCallLog,
            };
        }

        // ── Tool Call 1 complete → Ask for approval before Tool Call 2 ───────────
        const topMatch = matchResult.matches[0];
        const approvalPrompt =
            `I found ${matchResult.matches.length} candidate(s) for [${extractedSkills.join(', ')}]. ` +
            `The best match is **${topMatch.name}** (matched ${topMatch.matchScore} skill(s): ${topMatch.matchedSkills.join(', ')}). ` +
            `Would you like me to draft an introduction message to ${topMatch.name}? (Reply with their userId to approve)`;

        return {
            success: true,
            reasoning,
            toolCallsMade,
            matches: matchResult.matches,
            draftMessage: null,
            awaitingApproval: true,
            approvalPrompt,
            toolCallLog,
        };
    } catch (error) {
        const err = error as Error;
        return {
            success: false,
            reasoning: 'An error occurred during agent execution.',
            toolCallsMade,
            awaitingApproval: false,
            toolCallLog,
            error: err.message,
        };
    }
};
