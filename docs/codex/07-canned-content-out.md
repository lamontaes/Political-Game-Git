# Job 07: canned and fake content out

## Why

In play, Lamontae saw:

- canned news, "Several governments opened talks over fishing rights in shared waters" and a park-shelter proposal;
- meetings with nobody in the room;
- dialogue he called AI slop;
- buttons that do nothing, such as "speak at the meeting" and "let them pick the topic".

The 11:07 a.m. ruling on September 29 said: remove canned news. Old saves don't matter.

## Inventory

Build 23's final hand-back, on main 2ce7f9ad0; line numbers may have moved.

1. **Canned news.**
   - Delete `INTERNATIONAL_STAGES` and `INTERNATIONAL_SUBJECTS`, with the whole international family, in `src/simulation/living-world/developments.ts` (about lines 72 to 120).
   - Delete `LOCAL_SUBJECTS` in the same file (park shelter, road repair, facility hours, recycling site).
   - Delete `DEVELOPMENT_DISPUTES` and the crisis draw keyed to it in `src/simulation/pressure/events.ts` (about line 81, and its use near line 159).
   - Update the callers: `src/presentation/opening-life.ts` (`ensureLivingWorldDevelopments`) and `src/simulation/campaigns.ts` (`developmentStepTransitionHandler`).
   - `src/presentation/news-headlines.ts` (about line 25) carries the park-shelter headline.
2. **The canned meeting agenda** ("whether the public meeting room should open one extra evening each week"):
   - `src/simulation/life-opportunities.ts` (about lines 140 and 646 to 649);
   - `src/simulation/living-world/local-council-meetings.ts` (about lines 69 and 523);
   - `src/simulation/ordinary-meeting-presence.ts` (about lines 40, 50 and 427).

   The agenda must come from the ordinances filed for that meeting.

3. **Search the whole repository for other canned lists:** arrays of ready-made headlines, summaries, agenda items or dialogue lines that are not built from records. List each in the hand-back, then remove it or rebuild it from records.

## Replace, don't just delete

- **News comes from records.** The paper reports what happened: laws passed and their effects (already built, `src/simulation/press/law-effect-news.ts`), council votes, business openings and closings, deaths, crimes, election results.
- **Day one's paper carries the world's history from before January 5, 2026:** the November 2025 results, laws that took effect January 1, the council's recent votes, business openings and closings, deaths and obituaries. The desk sweep (`pressDeskSweepHandler` in `src/simulation/press/desk.ts`) must read records dated before day one on its opening pass.
- **Meetings.** The people present are the real attendees (members, staff, residents who came for an item on the agenda), posted in the scene. A public comment the player gives is recorded and heard by those present.
- **Dead buttons.** Every button either does what it says, with a record written, or is removed. List each in the hand-back.
- **Dialogue.** Lines come from the English engine built from the speaker's record, in the register of real speech (Congressional Record, state journals, council minutes). There are no generic "AI" lines.

## Checks

- Add a guard test that fails if any removed canned sentence returns.
- Count international and local stories in a 5-year watched world, before and after.
- Play the opening and one council meeting in the browser. Screenshots go in the hand-back.
