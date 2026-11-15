---
id: words-i-work-for-a-public-employer-is-said-as-people-say-it
title: "Say a public employer as people say it: for the state, for the county"
area: words
kind: bug
priority: 2
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
source: Account lead thread, Nov 15, 2026: M5 read "I work at the government of Ohio." and "I work at the County of Webster" in the played goodbye scenes of #9479
checked:
---

**What.** A person who works for a government says "I work at the government of Ohio." or "I work at the County of Webster." People say "I work for the state", "for the county", "for the town of Salado", "for the federal government" or "for the school district". The wrong wording reaches every talk where a public employee says where they work, for every public employer class (town, county, state, federal, school district), not only two examples. Seen: M5 and the second reader read "I work at the government of Ohio.", "I work at the government of Minnesota.", "I work at the government of Kentucky." and "I work at the County of Webster" in the played goodbye scenes of #9479.

**Cause.** Found in code: the work lines in conversation.json place the employer as "I work at {employer}", and `employerWords` in `src/director/conversation.ts` fills `{employer}` with `employerSaidAs` (src/english/said-as.ts), which returns the journal's name for a government payroll ("the government of Ohio", "the County of Webster"); the line's preposition is fixed as "at", which fits a business and not a government.

**Fix.** One reader for how a public employer is said in running text, in the said-as table (one row per class of government: town, county, state, federal, school district), covering the preposition ("for") as well as the name; the work lines read it through one slot. No per-line patches; the lines that say "at {employer}" for a business stay. Show the changed lines said at named places.

**Time box.** 2 hours, Sonnet.

**Rules.** Follow the standing rule "One rule, all 56 places" and the other standing rules in AGENTS.md; no place is named in logic, and every class of public employer is covered.

**Done when.** At a named place and seed (name each place and seed), a played talk with someone who works for each class of public employer (town, county, state, federal, school district) says it the way people say it. In three drawn places (name each place and seed) the same holds. A second session, on main, plays the same and sees it.

**Waits on.** The one-rule-for-names item (words-one-rule-for-how-often-a-name-is-said-in-a-talk) folding.

**Files.** src/english/said-as.ts, src/english/journal-words.ts, data/english/said-as.json, src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Raised by M5 reading the goodbye scenes of #9479; the Account lead asked for it as its own pull request after the names rule.
---
