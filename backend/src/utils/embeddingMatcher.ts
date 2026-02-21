/**
 * TeamForge — Embedding-Based Skill Matcher (Optional Enhancement)
 *
 * Replaces binary bag-of-words vectors with OpenAI text-embedding-3-small
 * embeddings. This captures semantic similarity, so:
 *   "React" ≈ "React Native"  ≈  "ReactJS"
 *   "Machine Learning" ≈ "ML" ≈  "Deep Learning"
 *
 * ─── When to use ─────────────────────────────────────────────────────────────
 *
 *  USE cosine + binary vectors (skillMatcher.ts) when:
 *    - Skills in DB are already standardised (e.g. from a tag dropdown)
 *    - You need zero API cost and offline operation
 *    - Dataset < 50k users
 *
 *  USE embeddings (this file) when:
 *    - Skills are free-text (typos, synonyms, abbreviations)
 *    - You need semantic matching ("Frontend Dev" → matches "React")
 *    - You can afford ~$0.00002 / 1k tokens embedding cost
 *
 * ─── Time Complexity ─────────────────────────────────────────────────────────
 *
 *  Let D = embedding dimensions (1536 for text-embedding-3-small)
 *
 *  generateEmbedding(skills)    | O(API call) — ~100ms round-trip
 *  cosineSimilarity(a, b)       | O(D) = O(1536) — negligible
 *  rankWithEmbeddings(query, U) | O(U × D) per call
 *                               | With Redis cache: O(D) per new user only
 *
 *  Optimisation: pre-compute and store user embeddings on profile save.
 *  Then ranking is just U × D dot products — no API calls at query time.
 *
 * ─── Setup ───────────────────────────────────────────────────────────────────
 *   npm install openai
 *   OPENAI_API_KEY=sk-...  # already in .env
 */

import OpenAI from 'openai';
import { UserSkillProfile, ScoredMatch, cosineSimilarity } from './skillMatcher';

// ─── Embedding vector type ────────────────────────────────────────────────────
export type EmbeddingVector = number[];           // 1536-dimensional
export type EmbeddingCache = Map<string, EmbeddingVector>; // cacheKey → vector

// ─── In-memory LRU-style cache (keyed by normalised skill string) ─────────────
// In production, replace this with Redis (ioredis) for cross-instance sharing.
const embeddingCache: EmbeddingCache = new Map();
const MAX_CACHE_SIZE = 5000;

const getCacheKey = (skills: string[]): string =>
    skills
        .map((s) => s.toLowerCase().trim())
        .sort()
        .join('|');

// ─── OpenAI Embedding API call ────────────────────────────────────────────────
/**
 * Converts a skill list to a single embedding vector by joining the skills
 * with commas. The model understands this as a "skill profile" string.
 *
 * Example input:  ["React", "TypeScript", "Node.js"]
 * Sent as text:   "React, TypeScript, Node.js"
 */
export const generateSkillEmbedding = async (
    skills: string[],
    client?: OpenAI
): Promise<EmbeddingVector> => {
    if (skills.length === 0) return new Array(1536).fill(0);

    const cacheKey = getCacheKey(skills);
    if (embeddingCache.has(cacheKey)) {
        return embeddingCache.get(cacheKey)!;
    }

    const openai = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const text = skills.join(', ');

    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',  // 1536-dim, cheap: ~$0.00002 / 1k tokens
        input: text,
        encoding_format: 'float',
    });

    const vector = response.data[0].embedding;

    // Evict oldest entry if cache is full
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
        const firstKey = embeddingCache.keys().next().value!;
        embeddingCache.delete(firstKey);
    }
    embeddingCache.set(cacheKey, vector);

    return vector;
};

// ─── Cosine similarity on plain number[] arrays ───────────────────────────────
export const embeddingCosine = (a: EmbeddingVector, b: EmbeddingVector): number => {
    // Reuse the Float32Array version from skillMatcher by converting
    const fa = new Float32Array(a);
    const fb = new Float32Array(b);
    return cosineSimilarity(fa, fb);
};

// ─── Batch embed all users in parallel (with concurrency limit) ───────────────
const PARALLEL_LIMIT = 5;

const batchEmbed = async (
    userSkillSets: string[][],
    client: OpenAI
): Promise<EmbeddingVector[]> => {
    const results: EmbeddingVector[] = new Array(userSkillSets.length);

    for (let i = 0; i < userSkillSets.length; i += PARALLEL_LIMIT) {
        const batch = userSkillSets.slice(i, i + PARALLEL_LIMIT);
        const embeddings = await Promise.all(
            batch.map((skills) => generateSkillEmbedding(skills, client))
        );
        embeddings.forEach((emb, j) => {
            results[i + j] = emb;
        });
    }

    return results;
};

// ─── Main: Rank users using embeddings ───────────────────────────────────────
/**
 * Semantically rank users by embedding cosine similarity.
 *
 * @param querySkills  - Skills being searched for
 * @param users        - Candidate user profiles from MongoDB
 * @param topN         - Max results to return (default 3)
 * @param minScore     - Minimum cosine score, 0–1 (default 0.3 for embeddings)
 */
export const rankUsersWithEmbeddings = async (
    querySkills: string[],
    users: UserSkillProfile[],
    topN = 3,
    minScore = 0.3
): Promise<ScoredMatch[]> => {
    if (querySkills.length === 0 || users.length === 0) return [];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Embed query + all users in parallel
    const [queryVec, ...userVecs] = await Promise.all([
        generateSkillEmbedding(querySkills, openai),
        ...users.map((u) => generateSkillEmbedding(u.skills, openai)),
    ]);

    const querySet = new Set(querySkills.map((s) => s.toLowerCase().trim()));

    const scored: ScoredMatch[] = users.map((user, i) => {
        const score = embeddingCosine(queryVec, userVecs[i]);
        const matchedSkills = user.skills.filter((s) =>
            querySet.has(s.toLowerCase().trim())
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
            totalSkills: user.skills.length,
        };
    });

    return scored
        .filter((m) => m.cosineSimilarity >= minScore)
        .sort((a, b) => b.cosineSimilarity - a.cosineSimilarity)
        .slice(0, topN);
};

// ─── Pre-computation helper: store embedding on user profile save ─────────────
/**
 * Call this in the User model's post-save hook or PATCH /users/me handler.
 * Stores the embedding string in the user document to avoid recomputing
 * at query time.
 *
 * Usage in userController.ts:
 *   const { embedding } = await precomputeUserEmbedding(updatedSkills);
 *   await User.findByIdAndUpdate(userId, { skillEmbedding: embedding });
 */
export const precomputeUserEmbedding = async (
    skills: string[]
): Promise<{ embedding: string }> => {
    const vec = await generateSkillEmbedding(skills);
    return { embedding: JSON.stringify(vec) };
};
