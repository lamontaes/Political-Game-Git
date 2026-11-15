---
id: words-i-work-for-a-public-employer-is-said-as-people-say-it
title: "Say an employer as people say it: for the state, for the county, and 'there' (not 'work') after the line already says work"
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

**Also (M5's read of #9502 at b8c816cb, 7 of 15 talks).** The employer said a second time comes out as "work" inside lines that already say work or take a person's own: "I work over at work.", "I'm with work.", "I work for work.". "I'm at work." and "At work." read right and stay. Cause, found in code: `nameOnceThen` in `src/english/said-as.ts` replaces every later mention of the name with `ownPlace.worker` ("work", said-as.json, owner via the coordinator, Nov 12) whatever words stand in front of the slot, so a frame that already says "work" or takes "with"/"for" gets a second "work". The fix is in the same reader: a later mention after a work verb plus its preposition, or after "with", is said "there" (a row in said-as.json `ownPlace`), and every other later mention stays "work".

**Cause.** Found in code: the work lines in conversation.json place the employer as "I work at {employer}", and `employerWords` in `src/director/conversation.ts` fills `{employer}` with `employerSaidAs` (src/english/said-as.ts), which returns the journal's name for a government payroll ("the government of Ohio", "the County of Webster"); the line's preposition is fixed as "at", which fits a business and not a government.

**Fix.** One reader for how a public employer is said in running text, in the said-as table (one row per class of government: town, county, state, federal, school district), covering the preposition ("for") as well as the name; the work lines read it through one slot. No per-line patches; the lines that say "at {employer}" for a business stay. Show the changed lines said at named places.

**Ruling (Words lead, Nov 15; /mnt/project-files/words-lead/public-employer-said-in-talk.md).** In talk, a government of the talk's own place (both people's town, county or state) is said by its class: "the state" (territory "the territory", D.C. "the District"), "the county" (parish, borough by the record's class word), "the city"/"the town"/"the village"/"the township", "the school district"; the federal government is "the federal government" everywhere; any other place's government keeps its full name ("the State of Ohio", "the Territory of Guam"); the Journal keeps its own forms. Built as said-as.json `governmentInTalk` read by `src/director/employer-in-talk.ts`, from the record's kind, class and the two people's places.

**Time box.** 2 hours, Sonnet.

**Rules.** Follow the standing rule "One rule, all 56 places" and the other standing rules in AGENTS.md; no place is named in logic, and every class of public employer is covered.

**Done when.** At a named place and seed (name each place and seed), a played talk with someone who works for each class of public employer (town, county, state, federal, school district) says it the way people say it. In three drawn places (name each place and seed) the same holds. A second session, on main, plays the same and sees it.

**Waits on.** The one-rule-for-names item (words-one-rule-for-how-often-a-name-is-said-in-a-talk) folding.

**Files.** src/english/said-as.ts, src/english/journal-words.ts, data/english/said-as.json, src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Raised by M5 reading the goodbye scenes of #9479; the Account lead asked for it as its own pull request after the names rule.
---

**Built (Nov 15, second read).** A commonwealth that is a state (Kentucky, Massachusetts, Pennsylvania, Virginia) is "the state"; Puerto Rico and the Northern Mariana Islands are "the commonwealth" (a row by jurisdiction key, for the Words lead to rule on). Another state's government and the school district are not built: no one who lives in a played town works for another state, and a school system is said by its name as a business is, so no talk reaches either; they are removed, not kept as unused rows. Federal employers keep the record's name, unchanged by this item. Seen said in talks at eleven named places: the state, the county, the city, the town, the village, the township, the borough, the parish, the District, the commonwealth and the territory.
