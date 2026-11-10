---
id: pool-release-cause-differs-reoffered
title: "An item released because its Cause differs from the code is offered again by the next pool next"
area: docs
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** START-A-BUILDER step 3 tells a builder whose item's Cause differs from the code to say so on the pull request and run pool release. Release sets the item back to open with a Notes line and leaves its Cause and Fix as they were, so the very next pool next offers the same wrong item again. On Nov 10 this happened twice within an hour: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth came straight back to opus-5234 after its release (PR #8253), and core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group went from opus-d23b to opus-5234 after opus-d23b measured it wrong (PR #8263). Each time a builder had to rewrite the Cause to Needs cause by hand on main.

**Cause.** Found in code: scripts/pool/index.ts, the release command (about line 1192), writes releasedText with the reason and status open and never touches the Cause; next offers every open item whose causeKind is not Needs cause (scripts/pool/standard.ts needsCause).

**Fix.** Add a --needs-cause flag to pool release that, besides releasing, rewrites the item's Cause to begin with "Needs cause." followed by the release reason and the old Cause, and sets its Fix to NO_FIX (scripts/pool/standard.ts), in the same commit. Name the flag in docs/pool/START-A-BUILDER.md step 3 and the paste prompt's line about a Cause that differs. Add the case to scripts/pool/next.test.ts: an item released with --needs-cause is not offered by next.

**Time box.** 2 hours

**Rules.** Replace, never layer: the flag replaces the hand rewrite of an item's Cause on main that builders do today, and START-A-BUILDER names only the flag. Rules, checks and skills merge first (owner, Nov 10): this changes the pool tool every builder uses, so it goes ahead of other work. Never build an item that says Needs cause (owner, Nov 10): the flag is what makes that hold after a release.

**Done when.** A second session runs npx vitest run scripts/pool/next.test.ts and sees the new case pass, then in a scratch checkout claims an open item, releases it with --needs-cause and a reason, and sees next offer a different item and the released item's Cause begin with Needs cause. This is the pool tool: nothing is drawn in the game and no place is involved.

**Waits on.** Nothing.

**Files.** scripts/pool/index.ts, scripts/pool/next.test.ts, docs/pool/START-A-BUILDER.md
