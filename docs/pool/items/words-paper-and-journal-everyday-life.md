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
blocked-on:
source: owner, Nov 1 ("what are the events that are reported in the news/in journal? there needs to be real ones with some good fluff or else it will get old")
---

**What.** The news bank has about 124 story kinds, most of them government process (bills, committees, roll calls, budgets), with 3 to 7 wordings each. It has no obituaries, no wedding or anniversary notices, no milestone birthdays or retirements, no letters to the editor and no local business features. The journal's everyday lines are 15 routine-day pieces. A paper that prints the same council sentence every week gets old. This item makes the paper and the journal carry real everyday life from records the world already keeps, worded with enough variety that a reader rarely meets the same sentence twice in a year. First it measures what a played year actually prints.

**Rules.** No hand-written player text: every story and line comes from the banks and cites the record it reports, never invented news (scene-standard, ask why). Wire to the world: a new story kind is printed only from a record an engine writes. Where the record does not exist yet (weddings wait on the lives lead's partnership engine; town events wait on `world-community-calendar`), the kind waits and says so. Every bank piece plays unless the owner's grades reject it.

**Done when.** A played year in three drawn places (named with seeds) prints a measured table of story kinds and journal lines by count, before and after. After: at least eight everyday kinds print from records (obituary with the life's facts, birth notice, milestone birthday, retirement, letter to the editor from a resident's recorded view of a law, business opening or anniversary feature, school honor, police and fire log), and no single sentence repeats more than three times in a year's paper. Tests: printed-words and grade-reach pass.

**Time box.** Two days, Words with at most two helpers, one PR per kind or per pair.

**Files.** data/english/parts/news.json, data/english/parts/headlines.json, data/english/parts/journal.json, src/bench/printed-words.ts, src/core2/modules/press.ts, src/bench/printed-words.test.ts

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
