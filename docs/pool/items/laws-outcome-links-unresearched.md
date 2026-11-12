---
id: laws-outcome-links-unresearched
title: "Research outcome-web links for the 27 laws that move no outcome"
area: laws
kind: research
priority: 2
size: M
status: merged
standard: 2
claimed-by: claude/pool-laws-outcome-links-unresearched
pr: #8548
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:01:19.074Z
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
merged-at: 2026-11-12T19:30:51.850Z
---

**What.** One law still moves no outcome-web measure because no researched link starts from it: local-minimum-wage-authority (outcome: local minimum wage adoption), the only row left in src/core2/data/laws/outcome-research-gaps.json. The list held 27 laws when this item was filed. Research the link's strength, shape and lag from the literature, add it to data/research/outcome-web/links.json, build it in the outcome web, remove the row from the gap file and close stopgap SG-LAW-outcome-link-unresearched.

**Cause.** Found in code: the `laws` array in src/core2/data/laws/outcome-research-gaps.json now lists one law, local-minimum-wage-authority, with stopgap SG-LAW-outcome-link-unresearched (src/core2/data/stopgaps/law.json); scripts/law-wiring/matrix.ts reads the file.

**Fix.** Find a sized source for the link (if none exists, say so in the row's note and keep the stopgap), add the link with its strength, shape, lag and spread to links.json, build it in src/core2/modules/outcome-web.ts, and remove the gap row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: each link cites its source, with size and spread, and real rates check totals. An effect is a read: the web reads the law or its measure, and the outcome moves for full and counted people alike.

**Done when.** A second session, not the builder, plays a year in a drawn place (place and seed named) where a state grants local minimum wage authority, and sees the new link fire with its outcome-web month record id in the law-wiring checker (scripts/law-wiring/check.ts), the row gone from outcome-research-gaps.json, and SG-LAW-outcome-link-unresearched resolved in src/core2/data/stopgaps/law.json. Nothing shows on screen yet; Politics > Issues and Government is where it would show.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/law.json

**Notes.** TODO

Oct 20 (claude, Sonnet): claimed and released unbuilt. `src/core2/data/laws/outcome-research-gaps.json`, the list of the 27 laws this item names, is not on main or on any branch I could find (searched every remote branch with "outcome" or "laws" in its name, and the repository history for the file name). Without that list there is nothing to research against. Whoever filed this item holds the file on an unpushed branch; push it, or re-derive it from the law-wiring checker's "moves no outcome" rows, then reopen.

Sent back 2026-10-21 from PR #5653 (branch claude/outcome-links-research): docs/pool/items/laws-outcome-links-unresearched.md:20 requires a built, played-world-proven link for every law in outcome-research-gaps.json. The current diff removes only budget-line:higherEducation from src/core2/data/laws/outcome-research-gaps.json (the former row around line 24); the body explicitly says 1 of 27 and 26 remain. A do-not-mark-done instruction does not provide the completed acceptance for this pool item. Track the one-link slice under a bounded item with its actual full place/seed and month record proof, while retaining the umbrella for the remaining laws. The conflict repair is present. No local gate pass is claimed.; finish on that branch, merge main into it first.

**Notes (pool redo, Nov 10).** The gap file has shrunk from 27 laws to one, so the 27-law framing and the one-of-27 send-back above are history; the part split the brief allows is not needed.
