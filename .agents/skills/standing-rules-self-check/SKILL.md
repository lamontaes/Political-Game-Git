---
name: standing-rules-self-check
description: One-page self-check for the standing owner rules of Our Civic Duty that no other skill covers (sliding scales and causes, game not spreadsheet, replace never layer, one model two tiers, the chain, owner decisions flagged, American English, every effect triggerable and traced in dev mode). Use before opening any PR; not for rules with their own skill (no-dice, look-first, day-one-in-motion and the rest).
---

# Standing rules self-check

Before a PR opens, answer each line below in the PR body in one sentence, or write "not touched". The rules with their own skill are listed at the end; use that skill instead. This file records rulings and never makes policy (AGENTS.md "Standing owner rules" has the owner's words).

1. **Sliding scales and causes.** Does anything flip at a threshold? Does a world event happen from a record (a hazard, a health record, a law, a price change) and not a monthly chance? Name the record.
2. **A game, not a spreadsheet (owner, Oct 14).** Does the change add a step to the player's life because real life has it? A mechanic exists only when the golden path needs it, The Political Process has it, or the owner asked for it by name. A real-world step the player would take is a question for the owner in the PR body, never a feature.
3. **Replace, never layer, and old material is deleted everywhere (owner, Oct 14 and Nov 14: "don't leave old shit in the files. Delete it. No need to keep a copy of everything.").** What did the PR delete? Not only code: banks, tests, docs, review pages and the shared project folder too. No "old", "superseded" or "-old" copy, no archive of what was replaced, no held copy; git keeps history. Say in the handoff what was deleted. (A line a ruling says will be built soon and that waits on a named pool item is work in hand, not old: the Account lead's reading, not the owner's words.) Old code, styles, data and markers go in the same change; the PR body counts them. Add the old path to the replaced list in `docs/current.json` and fix every pointer (`current-pointers`).
4. **One model, two tiers (owner, Oct 14).** A counted group is read by every engine with the same rule as a full person, times its count. A rule that applies only to full people is an unregistered placeholder.
5. **The chain is the acceptance (owner, Oct 14).** A bill, a budget line or an executive act is finished when one dollar or one rule is followed to a named person and back out, by record id: the record, the law in force changing, the payment or price, the person, the choice or view that moved, the director's scene or journal line.
6. **Owner decisions are flagged, never waited on (owner, Oct 14).** Build the simplest version that follows AGENTS.md, register a stopgap of kind `owner-decision`, and write the question under OWNER DECISIONS NEEDED in the PR body, after the reading line of `look-first`. English the owner can read: no office or tax jargon.
7. **American English everywhere.** `npm run spelling` lists what the guard would flag; `tests/guards/english/` enforces it.
8. **Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there (owner, Nov 14: "every single one of those should be able to be triggered using the game code and advanced in order to see the effect").** Dev mode and advanced are the same thing. For each effect the change adds (a law at town, county, state or country level, a budget line, an executive act, an event, a scene), name the dev mode control that causes it through the game's own calls and the Trace or "What came of it" line where its effect shows. A build that adds an effect dev mode cannot trigger and trace is not done: the missing control is part of the build, or its own pool item that this PR names under Waits on. "Could not reach it" in `seen-in-game` is a finding, never a pass.

## Rules with their own skill

`no-dice`, `one-rule-all-places`, `estimate-not-unknown`, `wire-to-the-world`, `ask-why` (standing-skills); `look-first`, `day-one-in-motion`, `researcher`, `speed-work`, `scene-pictures`, `scene-standard`, `player-screen-text`, `seen-in-game`, `remove-a-stopgap`, `current-pointers`.

- **Weights are not re-fit to make a behavior appear (Account lead, Nov 15), even when a citation is named.** Size things from the record, and bring the lead what is weighed against what. A cap or count set to what the world happens to give is a tuned number.
- **No count, span or flag stands in for a rule (Account lead, Nov 15).** A number of years, a count of rows or a boolean that approximates what a person, law or place would do is a stand-in; build the rule from the records that decide it, or register the stopgap naming the engine you could not find (`remove-a-stopgap`).
