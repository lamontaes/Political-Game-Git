---
id: docs-acceptance-rule-seen-in-the-game
title: "Nothing is called done until a second session has seen it in the running game, and dev mode is where that check is run"
area: docs
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
lead: fable
source: Fable build brief, Nov 9, 2026, piece 1 (docs/audits/fable-build-brief-2026-11-09.md on branch audit/fable-vision); Fable audit, root cause 2; owner, Nov 3, ruling 1
---

**What.** The audit's root cause 2: a feature counts as finished when a record exists and its builder's own test passes, and nobody has to open the game and see it. The pool says done 1,926 times, and 722 of its 3,096 items carry a send-back. The owner ruled on November 3: "Checkers never hold a merge; nothing is done until a second session replays its finish line on main; only confirmed work moves the number." This item writes that rule as steps for each kind of work (a law, a budget line, a scene, words, a screen, a simulation rule, a place fact, a speed change, a fix) into AGENTS.md and one skill, gives the pool a "merged" state that only a second session's check turns into "done", and makes dev mode able to serve as the check. Its parts are the pool items `play-dev-reach-reads-every-effect-record`, `play-dev-trace-answers-why-for-every-record-the-game-names`, `play-dev-failed-bill-says-why`, `play-dev-run-until-stops-far-from-the-player` and `laws-proof-tools-count-voters-not-the-people-reached`.

**Time box.** Three days for Fable with helpers on the same model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a second session follows one dollar or one rule from the bill to a named person in the running game before the word done is used. An effect is a read, not a record: the check reads what the engines recorded when they applied the law, in people and dollars, never the existence of a row. Replace, never layer: the old "done on merge" flip and the two proof tools that disagree are replaced in the same work, not kept beside the new ones. Look before you ask: the rule is the owner's November 3 ruling 1, cited, not a new policy.

**Done when.** A second session, not Fable, does all of this in the running game on main, in a drawn place it names with its seed. It passes a one-section tax bill through a body with dev mode's bill card and sees on the same card how the bill ended, how many sections a trade added, the law row it made, and who that law reached in full people in town, full people elsewhere, counted people and dollars. It passes a bill in Congress at a margin of 3 and reads "short of the votes to end debate" with the count needed. It asks Trace about every record id the Journal and the News name after 45 played days and none answers that the record does not exist. It runs until a law takes effect and the run stops on a law of its own town, county, state or the nation. It then marks this item with `npm run pool -- seen`, and the pool index lists it as done only after that; a screenshot of each step is attached to the pull request. The owner plays it: he turns on dev mode, passes a tax in his town and reads on the bill's own page who paid it and how much.

**Files.** AGENTS.md, .agents/skills/seen-in-game/SKILL.md, scripts/pool/index.ts, scripts/pool/done-on-merge.ts, docs/pool/README.md, .github/PULL_REQUEST_TEMPLATE.md, src/core2/law-reach/host.ts, src/core2/modules/legislature.ts, src/bench/dev-mode.ts, src/bench/dev-trace.ts, src/bench/dev-api.ts, src/bench/ui/dev-bill-card.mjs, src/bench/ui/dev-run.mjs, scripts/dev-tests/law-run.ts

**Notes.** Fable is building this on branch `claude/political-game-audit-build-h6d7tg` (plan posted on the crew thread, Nov 10). Dev mode's panel bugs (drawn under Members, "[object Object]", black on black, the cross-level bribe) are separate lane items filed the same night and are not part of this.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main, with one part left as its own item. The rule is on main: AGENTS.md step 5 ("Done means a second session saw it in the game"), `.agents/skills/seen-in-game/SKILL.md`, the merged-versus-done flip in `scripts/pool/done-on-merge.ts` with `pool seen`, and dev mode's bill card (`src/bench/ui/dev-bill-card.mjs`, with the cloture line "Short of the votes to end debate" in `src/bench/data/controls.json` line 1271). The Done when step that Trace answers for every record the Journal and News name is the open item play-dev-trace-answers-why-for-every-record-the-game-names. What is left is a second session's replay recorded with `npm run pool -- seen`, not a build.
