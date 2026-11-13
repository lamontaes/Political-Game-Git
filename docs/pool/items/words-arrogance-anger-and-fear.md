---
id: words-arrogance-anger-and-fear
title: "Arrogance, anger and fear:"
area: words
kind: feature
priority: 2
status: open
standard: 2
claimed-by:
pr: #8480
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
milestone:
source: "docs/coordination/words.md line 50 (unchecked checklist line)"
claimed-at:
size: M
checked: fable 2026-11-10
branch: claude/pool-words-arrogance-anger-and-fear
---

**What.** The English engine has plain and polite registers but no boasts, threats or alarms, so every angry, frightened or proud moment in a scene sounds the same. Mine boasts, threats and alarms from public-domain speech, in plain and rude versions, as bank parts with move tags, and have the director choose who says them from the speaker's traits and the situation. The player would notice a rival boasting after a win, a neighbor threatening over a bad law, and a worried person raising an alarm, each sounding like that person.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md line 861 (owner, Oct 14, 2026 afternoon rulings): 'Arrogance, anger and fear have words. Boasts, threats and alarms are mined from public-domain speech ... plain and rude versions included; the director decides who says them from traits.'

**Fix.** Add boast, threat and alarm moves to the bank parts (data/english/parts/conversation.json and its neighbors, in plain and rude versions, public-domain sources recorded), and have the director (src/director/conversation.ts) choose who uses them from the speaker's traits, the relationship and the recorded situation, citing both record ids. New lines play once they pass the words-machine rules; Story writes the lines.

**Time box.** 6 hours for one Sonnet session.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/guards/english/spelling-dates-units.test.ts` (run `npm run spelling`); No dice: the director chooses who speaks in anger or fear from traits, relationship and the recorded situation, never a roll or a percentage; Sliding scales and causes: intensity slides with the size of the cause and the speaker's temperament, with no threshold that flips a register; Research before building: mined lines are public-domain with the source kept; real speech sets the register and never picks one speaker's words; Ask why: each line cites the situation and trait that chose it; An effect is a read, not a record: the composer reads the traits and the situation when it renders; One rule, all 56 places: no place or person named in the parts.

**Done when.** A second session plays a one-year run of buildBenchWorld in a place drawn from all 56 with a seed the builder did not choose (both named) and sees composed scenes in the year that include at least one boast, one threat and one alarm, each with the speaker's trait record and the situation record that chose it, named by id, and tests/english-parts-banks.test.ts passes; in the game, losing an election to a rival is followed by the rival boasting, plainly or rudely by who the rival is.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts, tests/english-parts-banks.test.ts

**Notes.** Checklist line from words.md; verify against main before starting.
Sent back 2026-10-20 from PR #5219 (branch claude/political-game-pool-a4tcd1): Parts in data/english/parts/stance.json have origin: authored and shippable: true; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5219 (branch claude/political-game-pool-a4tcd1): The body claims live boasts/threats while the stance parts are held; Words ownership and the dated notes remain unaddressed. Rechecked unchanged head 1238a06b0a; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5219#issuecomment-6308136856; finish on that branch, merge main into it first.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:33 UTC) on branch claude/pool-words-arrogance-anger-and-fear.

Released (2026-11-11): Is the Story session's job: every line is new bank parts under data/english/parts (boasts, threats, alarms, plain and rude), which a builder may not write; the director's trait-based choice has nothing to choose among until those lines exist. Continue on branch claude/pool-words-arrogance-anger-and-fear and pull request #5219.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:35 UTC) on branch claude/pool-words-arrogance-anger-and-fear.

Released by next (2026-11-13): no push to claude/pool-words-arrogance-anger-and-fear since 2026-11-11 02:33 UTC, more than twice its 6-hour time box. Continue on branch claude/pool-words-arrogance-anger-and-fear and pull request #8480.
