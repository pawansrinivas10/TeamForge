/**
 * TeamForge — Cosine Similarity Skill Matcher
 *
 * Pure TypeScript implementation. Zero external dependencies.
 * Converts skill arrays into TF-IDF-weighted sparse vectors and
 * computes cosine similarity to rank users against a query skill set.
 *
 * ─── Time Complexity ────────────────────────────────────────────────────────
 *
 * Let:
 *   U  = number of candidate users
 *   S  = average number of skills per user / query  (typically 5–20)
 *   V  = vocabulary size  (|union of all skills across all users|)
 *
 * Step                          | Complexity
 * ------------------------------|---------------------------
 * buildVocabulary(users)        | O(U × S)
 * encodeVector(skills, vocab)   | O(S + V)  — O(V) for zero-fill
 * cosineSimilarity(a, b)        | O(V)
 * rankUsers(query, users)       | O(U × V)  — V per user comparison
 * topN slice                    | O(U log U) — sort
 * TOTAL                         | O(U × V) ≈ O(U × U × S)
 *
 * In practice V ≤ 200 and U ≤ 10,000, so worst-case is ~2M ops —
 * well within a single synchronous JS call (<5ms for 1,000 users).
 *
 * For >50k users, switch to the embedding-based approach
 * (see embeddingMatcher.ts) which pre-computes and caches vectors.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Sparse skill vector: vocabulary term → weight */
export type SkillVector = Map<string, number>;

/** Vocabulary: canonical skill → index */
export type Vocabulary = Map<string, number>;

export interface UserSkillProfile {
    userId: string;
    name: string;
    email: string;
    bio: string;
    skills: string[];
    availability: 'available' | 'busy' | 'part-time';
    [key: string]: unknown;
}

export interface ScoredMatch {
    userId: string;
    name: string;
    email: string;
    bio: string;
    skills: string[];
    availability: string;
    matchedSkills: string[];   // query skills that appear in user's skills
    cosineSimilarity: number;  // 0.0 – 1.0
    matchScore: number;        // raw overlap count (for display)
    totalSkills: number;
}

// ─── Normalise a skill string ─────────────────────────────────────────────────
// Lowercases and strips punctuation so "React.js" == "reactjs" == "react js"

export const normaliseSkill = (skill: string): string =>
    skill
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // strip non-alphanumeric (except spaces)
        .replace(/\s+/g, ' ')         // collapse whitespace
        .trim();

// ─── Build vocabulary from all user skill arrays ─────────────────────────────
// Returns a map: normalised skill → unique index

export const buildVocabulary = (
    allSkillSets: string[][]
): Vocabulary => {
    const vocab: Vocabulary = new Map();
    let idx = 0;
    for (const skills of allSkillSets) {
        for (const skill of skills) {
            const norm = normaliseSkill(skill);
            if (norm && !vocab.has(norm)) {
                vocab.set(norm, idx++);
            }
        }
    }
    return vocab;
};

// ─── Encode a skill list as a binary term-presence vector ─────────────────────
// Returns a Float32Array of length |vocab|.
// Value is 1.0 if the skill is present, 0.0 otherwise.
// (Binary encoding gives good cosine results for skill sets; TF doesn't help
//  here since each skill appears at most once per user.)

export const encodeVector = (skills: string[], vocab: Vocabulary): Float32Array => {
    const vec = new Float32Array(vocab.size); // zero-initialised
    for (const skill of skills) {
        const norm = normaliseSkill(skill);
        const idx = vocab.get(norm);
        if (idx !== undefined) {
            vec[idx] = 1.0;
        }
    }
    return vec;
};

// ─── Cosine similarity between two equal-length dense vectors ────────────────
// cos(θ) = (A · B) / (‖A‖ × ‖B‖)
// Returns 0–1. Returns 0 if either vector is the zero vector.

export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
};

// ─── Main Ranking Function ────────────────────────────────────────────────────
/**
 * Rank an array of user profiles against a query skill list using
 * cosine similarity. Returns the top `topN` matches in descending order.
 *
 * @param querySkills  - Skills we are searching for
 * @param users        - Candidate users from the database
 * @param topN         - Maximum number of results to return (default 3)
 * @param minScore     - Minimum cosine similarity to include (default 0.1)
 */
export const rankUsersBySkills = (
    querySkills: string[],
    users: UserSkillProfile[],
    topN = 3,
    minScore = 0.1
): ScoredMatch[] => {
    if (querySkills.length === 0 || users.length === 0) return [];

    // Step 1 — Build unified vocabulary from query + all user skill sets
    const allSkillSets = [querySkills, ...users.map((u) => u.skills)];
    const vocab = buildVocabulary(allSkillSets);

    // Step 2 — Encode query vector once
    const queryVec = encodeVector(querySkills, vocab);

    // Step 3 — Encode each user, compute cosine similarity
    const normalisedQuery = new Set(querySkills.map(normaliseSkill));

    const scored: ScoredMatch[] = users.map((user) => {
        const userVec = encodeVector(user.skills, vocab);
        const score = cosineSimilarity(queryVec, userVec);

        const normUserSkills = user.skills.map(normaliseSkill);
        const matchedSkills = user.skills.filter((s) =>
            normalisedQuery.has(normaliseSkill(s))
        );

        return {
            userId: user.userId,
            name: user.name,
            email: user.email,
            bio: user.bio,
            skills: user.skills,
            availability: user.availability,
            matchedSkills,
            cosineSimilarity: parseFloat(score.toFixed(4)),
            matchScore: matchedSkills.length,
            totalSkills: normUserSkills.length,
        };
    });

    // Step 4 — Filter below threshold, sort DESC, take topN
    return scored
        .filter((m) => m.cosineSimilarity >= minScore)
        .sort((a, b) =>
            b.cosineSimilarity - a.cosineSimilarity ||
            b.matchScore - a.matchScore ||
            b.totalSkills - a.totalSkills
        )
        .slice(0, topN);
};

// ─── Convenience wrapper: score a single (user, query) pair ──────────────────
export const scoreUserAgainstQuery = (
    querySkills: string[],
    userSkills: string[]
): number => {
    const vocab = buildVocabulary([querySkills, userSkills]);
    const qVec = encodeVector(querySkills, vocab);
    const uVec = encodeVector(userSkills, vocab);
    return cosineSimilarity(qVec, uVec);
};
