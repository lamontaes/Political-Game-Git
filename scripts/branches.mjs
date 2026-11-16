// The two branches (owner, Nov 15 and 16, 2026; docs/coordination/TWO-BRANCHES.md).
// WORK_BRANCH is where all work and all tests land and every check runs: pull
// requests merge into it, pool claims and status flips push to it, and a
// session branches from it and compares with it. GAME_BRANCH holds only the
// game, with every test file stripped; only the promote step
// (scripts/promote/promote.mjs) writes it, and builds come from it.
// A script that must stay dependency-free may repeat the name at the top of the
// file with a comment that points here.
export const WORK_BRANCH = "dev";
export const GAME_BRANCH = "main";
/** `origin/<work branch>`: what a session branches from and compares with. */
export const WORK_REF = `origin/${WORK_BRANCH}`;
