---
id: words-progress-labels-only-in-dev-responses
title: "The path-progress labels ride only in the dev view's own response, so the line register can prove they are never said"
area: words
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Lead's call, Nov 16 (from the story builder's line-register exemptions, #9704)
claimed-at:
checked: story builder 2026-11-16
---

**What.** The line register still counts 13 labels in src/bench/progress.ts (the golden-path steps and world modules "not in the new core yet") as player text. Only dev mode's watch panel (src/bench/ui/dev-watch.mjs, from /api/progress) shows them, but the register cannot prove that, because src/bench/handler.ts also puts `progress: benchProgress(...)` into the /api/advance, new-life and continue responses (lines near 2600, 2783 and 2856 at c632d28e), which a player's browser receives. src/bench/play.mjs never reads `progress` from them.
Seen: the 13 progress.ts lines are gone from the register's code count, proved by its exemption rule.

**Cause.** Found in code: src/bench/handler.ts sends benchProgress (in the /api/advance route's send, line 2600 at c632d28e, and the new-life and continue routes, lines 2783 and 2856) in three play responses that no screen but dev-watch reads; the exemption rule in scripts/words/line-register.ts (exemptProblems) fails any read of an exempt symbol from a file that is not a test or developer file, and handler.ts is neither.

**Fix.** Drop the `progress` field from the advance, new-life and continue responses in handler.ts (check that verify.mjs and any test reading `value.progress` use /api/progress instead), then list `benchProgress` in scripts/words/line-register-exempt.json with its reason (read only by dev-watch through /api/progress and by m0-check.ts) and lower the baseline. If handler.ts must keep calling it for /api/progress, move the route's call into a dev-views file so the only non-developer reader is gone.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer. Ask the session holding handler.ts and play.mjs (filing-counter builder) before editing.

**Done when.** A second session starts a new life at a drawn place on the bench, opens dev mode's watch panel and sees the golden-path steps listed there, while the play screen shows nothing of them; `node --import tsx scripts/words/line-register.ts` counts 0 for src/bench/progress.ts, tests/guards/english/line-register.test.ts passes, with a 1440x900 screenshot of the panel naming the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/verify.mjs, scripts/words/line-register-exempt.json, tests/guards/english/line-register-baseline.json

**Notes.**

- Filed Nov 16, 2026 by the story builder on the B2b branch, per the lead's call: no handler.ts change tonight.
