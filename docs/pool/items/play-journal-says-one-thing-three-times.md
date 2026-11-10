---
id: play-journal-says-one-thing-three-times
title: "A journal paragraph says a mother's job three times in a row: started a new job, got a new job, works as a sales representative (Blodgett Landing, New Hampshire)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, "What a player sees")
---

**What.** Measured by the audit on Nov 9 in Blodgett Landing, New Hampshire (a random world; the audit gives no seed), playing a 17-year-old girl the game named Ray Kent: "The journal's third paragraph says one thing three times: 'Three years on, my mother started a new job. My mother got a new job. My mother Tonya works as a sales representative.'" Read in code on main, Nov 10, not measured: `householdMoments` in `src/director/journal.ts` (line 282) makes one journal moment for each work spell a parent began while the player was a child at home (`household:moment:parent-new-job`, lines 416 to 427), and those moments carry no facts, so their only wordings are the bare pieces "{other} started a new job." and "{other} got a new job." in `data/english/parts/journal.json` (about lines 6451 and 6477). It then adds a livelihood moment for the job each earner holds on day one (`household:livelihood`, line 468), worded "{named} works as {job}." Two spells and the current job give three sentences that tell a reader one thing. Fix the cause for every relative and every kind of record: a moment that has nothing to add beyond a line already in the paragraph is not told, and a new-job line names the job and the employer from the spell's record so two of them are two different facts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the lines stay bank pieces composed by the English engine, and the fix is in which moments are told and what facts they carry, never a sentence typed into the journal's code. Ask why: each line kept must name the record it tells (the spell's id, the job's id), so a reader can ask why it is there. OWNER-DECISIONS, Oct 14, morning (owner, spoken; recorded by the CTO): "The journal is a dramatized story, not a list of facts... No entry is a lone event with no story around it." Owner, Nov 8, about 2:20 p.m. Eastern, on the journal: "Again, it's just words."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof) as a player young enough to have parents at home, opens Journal and takes a screenshot at 1440×900 of each chapter. No paragraph may say the same fact about the same person twice: no two sentences in one paragraph that both say only that a relative has or took a job. Every sentence about a relative's job names the job or the employer. The proof lists, for one paragraph, each sentence beside the record id it tells. A test builds the journal in six drawn places and fails when two lines of one chapter share a counterpart and a kind and carry no differing fact. The same check is then run in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro, on the third paragraph. The owner plays it: he reads his journal and each sentence tells him something the one before did not.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, data/english/parts/journal.json

**Notes.** From the audit's Pillar 4, measured in the browser life; the same line appears in the audit's page one. The audit also says this paragraph "popped up during the President's address"; that is play-journal-pop-up-appears-over-a-scene (filed Nov 10). The same mother's card says she is a commissioner: play-a-relatives-card-and-journal-disagree-on-her-job (filed Nov 10). The opener "Three years on" is right now: the span words reach years (`data/english/span-words.json`), which fixes the Nov 8 playtest's "More than a year on" (point P36). Related claimed item: director-journal-line-links (each journal line records how it follows the one before); related open: words-paper-and-journal-everyday-life. The Words lead grades by scenes and owns the journal's wording (`.agents/skills/words-engine/SKILL.md`); read `.agents/skills/scene-standard/SKILL.md` on narration that restates. Not verified by the audit: how many work spells the mother's record holds, and whether the two bare lines came from two spells or from one spell told twice; the code reading above says two spells, and the builder confirms it by record id in the audit's place before changing anything.
