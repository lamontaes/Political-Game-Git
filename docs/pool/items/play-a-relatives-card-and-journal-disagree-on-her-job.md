---
id: play-a-relatives-card-and-journal-disagree-on-her-job
title: "A mother's card says commissioner since 2022, the journal says sales representative, and Travel puts her at a supply company at 8:30 p.m. (Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-play-a-relatives-card-and-journal-disagree-on-her-job
pr: #8746
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, "What a player sees")
model: sonnet
effort: high
root: rc3-thin-life-record
checked: fable 2026-11-10
claimed-at: 2026-11-11T07:45:32.895Z
---

**What.** Measured by the Nov 9 audit in Blodgett Landing, New Hampshire (a random world, no seed), playing a 17-year-old girl the game named Ray Kent: the mother's card says she has served as commissioner since 2022, the journal says she is a sales representative, and at 8:30 p.m. the Travel screen places her at a supply company. Three screens tell a player three different things about what one woman does, because each reads a different record. Fix the class for every person: what someone does is one record that every screen reads the same way (an office and a job told together when she holds both), and where she is at an hour comes from the one record of where people are, which is her work spans at the clock's minute.

**Cause.** Found in code: `summaryOf` in src/bench/card.ts (line 634) says the office when the person has an office run and names their work only when they have none; the `household:livelihood` moment built by `householdMoments` in src/director/journal.ts (line 473) reads the job held on day one and never an office; `townPlaces` in src/bench/places.ts (line 69) lists a relative's workplace from the job record and names who is on shift from their work spans. Measured by the Nov 9 audit in Blodgett Landing, New Hampshire (no seed given).

**Fix.** Make the card, the journal and Travel read one record of a person's work and office (an office and a job told together when she holds both), and have Travel place her by her work spans at the clock's minute. First settle by record id, in the audit's place, whether the mother really holds both a commissioner term and a sales job, or whether one record is wrong. Build the smallest change that makes the three agree; the larger one-record fix belongs to the life record (docs/design/life-record.md).

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the card, the journal and Travel must read the same record of a person's work and office, and a screen that keeps or picks its own version of the fact is a duplicate. One model, two tiers: a relative filled in on a click must match what the books already say about her job, pay and office. Owner, Oct 28 (AGENTS.md, where the game is going): "It's just different ways of displaying the same information... That's how literally every single game works." Owner, Nov 8, 2:10 p.m.: "There's one date and there's one time. One date, one time." The player-screen-text skill, "Figures that must agree".

**Done when.** A second session starts the bench (`npm run bench`) with dev mode on and starts a new game in a drawn place (place and seed named in the proof). For each member of the player's household and for three officeholders opened from Government, it takes screenshots at 1440×900 of the person's card, of the Journal chapter that names them, and of Travel at two hours of the day (one inside and one outside their work hours), and reads the person's job, office term and work-span record ids in dev mode's person panel. For each person the three screens must agree with those records and with each other: a person who holds an office and a job is told with both on the card and in the journal; nobody is shown at a workplace outside the hours their work spans give; a term the card names exists in the offices table with those years. The proof is a table of person, record id, and what each screen said. The same check is then run on the player's mother in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: he opens his mother's card, his journal and Travel and they tell him the same thing about her.

**Waits on.** core-life-record-part-1-the-journal-reads-the-life-list, which rewrites `householdMoments` in src/director/journal.ts; build this on top of it, not beside it.

**Files.** src/bench/card.ts, src/director/journal.ts, src/bench/places.ts, src/bench/ui/travel-screen.mjs, src/bench/play.mjs, src/core2/work-spans-v1.ts

**Notes.** From the audit's Pillar 4, measured in the browser life. What the audit did not verify, and the builder must settle first by record id in the audit's place: whether the mother's records really hold both a serving term as commissioner since 2022 and a job as a sales representative (both can be true of a part-time county office), or whether one of them is wrong; and whether Travel showed her as on shift at 8:30 p.m. or only listed the supply company as a family workplace (the card's reason line). If she holds both, the defect is that each screen tells half; if a work span really has her on shift at 8:30 p.m., that is a record defect for the lead who owns work hours, to be filed with the span's id. The Coordinator's Nov 8 call (OWNER-DECISIONS, the night Coordinator's calls): "The people present at a place follow the hour." Related, filed Nov 10: play-journal-says-one-thing-three-times (the same paragraph), play-one-person-shows-two-faces (the same family's faces). Related done item whose proof did not cover this: words-person-history-tells-a-story (the card's summary lines, Nov 1). This item waits on nothing, but the larger fix the audit names for Pillar 4 (one life record that the journal, the card, the You screen and the scenes all read) will replace the three readers; build this as the smallest change that makes them agree, and say in the PR body what the life record should take over.
