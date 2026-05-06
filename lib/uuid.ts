/**
 * lib/uuid.ts — Thin mockable wrapper over crypto.randomUUID().
 *
 * This single-line wrapper exists solely as a Vitest-mockable seam:
 *   vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))
 * Without this seam, tests that assert specific block/category IDs would be
 * non-deterministic because crypto.randomUUID() returns different values each call.
 *
 * crypto.randomUUID() is a built-in browser+Node API (Next.js Edge runtime ships it).
 * No new npm dependencies required.
 */
export const uuid = (): string => crypto.randomUUID();
