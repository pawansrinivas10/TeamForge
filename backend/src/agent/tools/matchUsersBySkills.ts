import User from '../../models/User';
import { rankUsersBySkills, UserSkillProfile, ScoredMatch } from '../../utils/skillMatcher';
import { rankUsersWithEmbeddings } from '../../utils/embeddingMatcher';

// ─── Public types re-exported for aiController / openaiAgent ─────────────────
export type { ScoredMatch };

export interface MatchUsersInput {
    skills: string[];
    limit?: number;
    excludeUserId?: string;
    availabilityFilter?: 'available' | 'busy' | 'part-time';
    /** Use OpenAI embeddings for semantic matching (requires OPENAI_API_KEY) */
    useEmbeddings?: boolean;
}

export interface MatchUsersOutput {
    matches: ScoredMatch[];
    searchedSkills: string[];
    totalFound: number;
    algorithm: 'cosine-binary' | 'cosine-embedding';
}

// Keep the old name alive so existing imports don't break
export type { ScoredMatch as MatchedUser };

// ─── Tool: match_users_by_skills ─────────────────────────────────────────────
/**
 * Two-stage pipeline:
 *
 *  Stage 1 — Pre-filter (MongoDB)
 *    Pull candidates whose skills array has *any* overlap with the query.
 *    This dramatically reduces the cosine computation set for large DBs.
 *    For a DB with 10k users and a 10-skill query, this typically returns
 *    100–500 candidates — not 10k.
 *
 *  Stage 2 — Cosine Ranking (in-process)
 *    Run rankUsersBySkills() on the candidate set, sort by cosine score,
 *    return top `limit` results.
 */
export const matchUsersBySkills = async (
    input: MatchUsersInput
): Promise<MatchUsersOutput> => {
    const {
        skills,
        limit = 5,
        excludeUserId,
        availabilityFilter,
        useEmbeddings = false,
    } = input;

    if (!skills || skills.length === 0) {
        throw new Error('match_users_by_skills requires at least one skill');
    }

    // ── Stage 1: Pre-filter via MongoDB $in ───────────────────────────────────
    // Fetch 5× more candidates than needed so cosine has enough to choose from.
    const preFilterLimit = Math.min(limit * 5, 200);

    const mongoFilter: Record<string, unknown> = {
        skills: {
            $in: skills.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
        },
    };
    if (excludeUserId) mongoFilter['_id'] = { $ne: excludeUserId };
    if (availabilityFilter) mongoFilter['availability'] = availabilityFilter;

    const rawUsers = await User.find(mongoFilter)
        .select('_id name email bio skills availability')
        .limit(preFilterLimit)
        .lean();

    if (rawUsers.length === 0) {
        return { matches: [], searchedSkills: skills, totalFound: 0, algorithm: 'cosine-binary' };
    }

    // ── Map Mongoose docs to plain UserSkillProfile ───────────────────────────
    const candidates: UserSkillProfile[] = rawUsers.map((u) => ({
        userId: (u._id as { toString(): string }).toString(),
        name: u.name as string,
        email: u.email as string,
        bio: (u.bio as string) || '',
        skills: (u.skills as string[]) || [],
        availability: (u.availability as 'available' | 'busy' | 'part-time') || 'available',
    }));

    // ── Stage 2: Cosine Ranking ───────────────────────────────────────────────
    let rankedMatches: ScoredMatch[];
    let algorithm: MatchUsersOutput['algorithm'];

    if (useEmbeddings && process.env.OPENAI_API_KEY) {
        rankedMatches = await rankUsersWithEmbeddings(skills, candidates, limit, 0.3);
        algorithm = 'cosine-embedding';
    } else {
        rankedMatches = rankUsersBySkills(skills, candidates, limit, 0.1);
        algorithm = 'cosine-binary';
    }

    return {
        matches: rankedMatches,
        searchedSkills: skills,
        totalFound: rankedMatches.length,
        algorithm,
    };
};
