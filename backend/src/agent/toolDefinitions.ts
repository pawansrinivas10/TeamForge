import OpenAI from 'openai';

/**
 * TeamForge AI Agent — OpenAI Tool Definitions
 *
 * These are the only two tools the agent is permitted to call.
 * The schemas are intentionally strict (additionalProperties: false,
 * required fields enforced) to prevent the model from inventing parameters.
 */

export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'match_users_by_skills',
            description:
                'Search the TeamForge database for users whose skills overlap with the specified skill list. ' +
                'Returns a ranked list of real, verified users with match scores. ' +
                'ONLY call this tool when the user has specified at least one concrete skill to search for. ' +
                'Do NOT call this speculatively or with vague terms like "good developer".',
            parameters: {
                type: 'object',
                properties: {
                    skills: {
                        type: 'array',
                        items: { type: 'string' },
                        description:
                            'Concrete skill names to match against user profiles. ' +
                            'Examples: ["React", "Node.js", "TypeScript"]. ' +
                            'Must be between 1 and 10 items. Use exact technology names, not adjectives.',
                        minItems: 1,
                        maxItems: 10,
                    },
                    limit: {
                        type: 'integer',
                        description: 'Maximum number of users to return. Defaults to 5. Hard max is 10.',
                        default: 5,
                        minimum: 1,
                        maximum: 10,
                    },
                    availability_filter: {
                        type: 'string',
                        enum: ['available', 'busy', 'part-time'],
                        description:
                            'Optional. Only return users with this availability status. ' +
                            'Omit if the user has not specified a preference.',
                    },
                },
                required: ['skills'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'draft_intro_message',
            description:
                'Generate a professional introduction message from the current user to a matched candidate, ' +
                'in the context of a project collaboration invitation. ' +
                'IMPORTANT: Only call this AFTER the user has explicitly approved sending a message to a specific person. ' +
                'The to_user_id MUST be a userId that was returned by a previous match_users_by_skills call. ' +
                'NEVER call this tool speculatively or before user approval.',
            parameters: {
                type: 'object',
                properties: {
                    to_user_id: {
                        type: 'string',
                        description:
                            'The MongoDB ObjectId of the recipient user. ' +
                            'Must be a userId previously returned by match_users_by_skills in this conversation. ' +
                            'Pattern: 24 hex characters.',
                        pattern: '^[a-f0-9]{24}$',
                    },
                    project_id: {
                        type: 'string',
                        description:
                            'Optional. The MongoDB ObjectId of the project this invitation is for. ' +
                            'Adds project context (title, description) to the message.',
                        pattern: '^[a-f0-9]{24}$',
                    },
                    custom_note: {
                        type: 'string',
                        description:
                            'Optional. Additional context from the requesting user to include verbatim in the message body. ' +
                            'Maximum 300 characters.',
                        maxLength: 300,
                    },
                },
                required: ['to_user_id'],
                additionalProperties: false,
            },
        },
    },
];
