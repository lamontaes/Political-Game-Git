---
id: words-paper-and-journal-everyday-life
title: "The paper and the journal carry everyday life from the records: obituaries, weddings and births, milestones, letters to the editor, local business, with enough wordings that nothing repeats"
area: words
lead: words
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on: words-paper-and-journal-everyday-life-part-1-race-roundups, words-paper-and-journal-everyday-life-part-2-outlet-memory, words-paper-and-journal-everyday-life-part-3-letters, words-paper-and-journal-everyday-life-part-4-birth-notices
source: owner, Nov 1 ("what are the events that are reported in the news/in journal? there needs to be real ones with some good fluff or else it will get old")
after:
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: fable 2026-11-10
---

**What.** The news bank has about 124 story kinds, most of them government process (bills, committees, roll calls, budgets), with 3 to 7 wordings each. It has no obituaries, no wedding or anniversary notices, no milestone birthdays or retirements, no letters to the editor and no local business features. The journal's everyday lines are 15 routine-day pieces. A paper that prints the same council sentence every week gets old. This item makes the paper and the journal carry real everyday life from records the world already keeps, worded with enough variety that a reader rarely meets the same sentence twice in a year. First it measures what a played year actually prints.

**Cause.** Measured: the played-year table of Lane 3 (Nov 4; seed kinds:2 is Rote, Pennsylvania; drawPlace purpose printed-words, seeds kinds:0, kinds:1 and kinds:2: Newbury, Kansas; Kannat Tabla, Northern Mariana Islands; Rote, Pennsylvania). Most everyday kinds now print (obituary, round birthday, retirement, business opening and anniversary, school honor, police log), but in Rote "Kayla Pitts is a candidate for Supervisor." printed 56 times and "…is running for Supervisor." 54 times, and no letter to the editor and no birth notice printed in any of the three places. Each campaign gift and endorsement is its own printed story opened by the campaign-gift-office context line (2 pieces), so adding variants cannot keep a paper that prints 185 gift stories under three repeats; letters are written in src/core2/modules/press.ts (LETTER_DECISION, line 3055) only past a bar none reached, and birth notices have no press kind.

**Fix.** Four pieces, each its own item: print a race's gifts and endorsements as a periodic roundup (part 1) or have each outlet remember the context sentences it printed for a race (part 2), whichever the CTO rules; let letters to the editor print from a resident's recorded view (part 3); add a birth-notice press kind from the person-birth record (part 4).

**Time box.** 3 hours for one Sonnet session, the closing replay once the parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: every story and line comes from the banks and cites the record it reports, never invented news (scene-standard, ask why). Wire to the world: a story kind prints only from a record an engine writes; where the record does not exist the kind waits and says so. Every bank piece plays unless the owner's grades reject it.

**Done when.** A second session, not the builder, replays the played-year table in the same three seeded places (kinds:0, kinds:1, kinds:2) and in one drawn place it names: no single sentence prints more than three times in a year's paper, a letter to the editor prints from a resident's recorded view, and a birth notice prints from the person-birth record, each by record id. The parts' own done-when lines are met and tests printed-words and grade-reach pass.

**Waits on.** The four parts (blocked-on). Parts 1 and 2 are alternatives the CTO has not ruled between: a roundup in src/core2/modules/press.ts or a per-outlet memory in src/english/english-newscast.ts.

**Files.** data/english/parts/news.json, data/english/parts/headlines.json, data/english/parts/journal.json, src/bench/printed-words.ts, src/core2/modules/press.ts, src/bench/printed-words.test.ts, src/english/english-newscast.ts

**Notes.** Filed by the CTO, Nov 1 18:00, on the owner's question. Read: OWNER-DECISIONS (Oct 30 press briefs, Nov 1 every life simulated), the briefs column (#6824). Searched the pool for obituary, wedding, anniversary, letters to the editor and festival: no twin.

Words handoff, Nov 2 02:50 UTC (the account at its weekly limit): branch words/paper-everyday, head adb0e0253a, fully merged. Merged toward it: meetings by what the body did (#7022), obituaries with life facts, round birthdays and business anniversaries (#7040), retirements (#7047), the paper's repeats (#7070) and letters (#7050) as they land. Next step: rerun the played-year kinds table in three drawn places, list which of the eight everyday kinds still print nothing (the police and fire log needs the laws lead's fire record), and finish or file those.

Lane 3 (Nov 4), the played-year table rerun on main (drawPlace purpose `printed-words`, seeds kinds:0, kinds:1 and kinds:2):

- **Newbury, Kansas:** 731 printed. Top kinds: campaign-endorsed 137, town-hall 65, housing.purchase 49, meetings-week 43. Everyday: life.death 5, school.honor 4.
- **Kannat Tabla, Northern Mariana Islands:** 926 printed. Everyday: police-log 60, retirement 42, organization.founded 30, anniversary 12, school.honor 6, birthday 6.
- **Rote, Pennsylvania:** 1,290 printed. housing.purchase 300, campaign-gift 185, campaign-endorsed 120, meetings-week 120. Everyday: police-log 30, life.death 10, anniversary 10, school.honor 5, retirement 5.
- **Everyday kinds now printing:** obituary, round birthday, retirement, business opening (organization.founded) and anniversary, school honor, police log. Letters and birth notices weren't in the shown part of the lists; check them next.
- **Repeats are far over three:** Rote, "Kayla Pitts is a candidate for Supervisor." 56 times and "…is running for Supervisor." 54 times. Kannat Tabla, "Reports of vandalism in Kannat Tabla dropped this month." 36 times and "Banks Supply Company has laid off workers." 24 times. Newbury, "The bill goes back to lawmakers, who can vote to override the veto." 11 times.
- **The cause is volume, not only variety.** Each campaign gift and endorsement is its own printed story, opened by the `campaign-gift-office` context line, which has 2 pieces. A paper that prints 185 gift stories can't stay under three repeats by adding variants. Either the press prints a race's gifts and endorsements as a periodic roundup (core `press.ts`), or the newscast says a story's context sentence only when that outlet hasn't printed it for the same race lately, which needs a memory across stories that the composer doesn't have. That's a design call for the CTO.
- **Checked, Nov 4:** in all three places no letter to the editor and no birth notice printed in the year. Letters are written in `src/core2/modules/press.ts` (around line 3240) only by a follower of a newspaper whose stance on an enact-or-repeal policy question was last moved by that paper's own story, past the `LETTER_DECISION` bar. None qualified in a year in Newbury, Kannat Tabla or Rote. Birth notices have no press kind. Both are core press work, not Lane 3's files; the words exist for letters. That leaves two of the eight everyday kinds missing in play.

Lane 3 (Nov 4, evening): of the two fixes for the repeats, the second isn't Lane 3's alone. `composeNewsStory` (src/english/english-newscast.ts) words one story at a time, and Lane 4's `worded` in src/bench/archive-words.ts calls it once per story id, so neither keeps what an outlet already printed. A memory of printed context sentences needs Lane 4 to pass it per outlet; Lane 3 would then skip a sentence already printed. The roundup is core press volume. Still the CTO's call which one.
