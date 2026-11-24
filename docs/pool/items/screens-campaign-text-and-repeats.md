---
id: screens-campaign-text-and-repeats
title: "Volunteer and endorsement results show the record's count, the Journal says a date once, a quiet paper shows nothing"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The owner's Nov 24 grading packet (Story lead's read, 7142205405 on #9750): the Volunteers and Endorsements results read "Asked 12, 5 said yes: 5 volunteers now" and "Endorsements: 12 / 12" with an empty speaker block, the Journal page repeats its date ("Monday, January 20 | 2025 | Monday, January 20"), and the first evening's News reads "Nothing from Greeley Register yet."
Seen: the packet's Greeley, Colorado life 1 pictures at 1440 by 900. Seen: the same screens after the fix. Guards: journal-news-no-repeat.browser.mjs, volunteer-shift.browser.mjs, endorsement-meeting.browser.mjs

**Cause.** Measured: `node src/bench/journal-news-no-repeat.browser.mjs` against `npm run bench` on main shows the chapter's title over its page as well as in its row. The act result in src/bench/play.mjs builds the volunteer line from controls.campaignVolunteers.asked and the endorsement line as a fraction of those asked; playAsks draws a speech for every person asked, including one whose line is empty; journalScreen in src/bench/ui/strips.mjs heads each chapter's page with the chapter's title; emptyNewsLine in src/bench/ui/news-board.mjs prints a named filler line for a paper with nothing.

**Fix.** Word the result as the campaign record's count through the existing volunteer and endorsement labels (the server returns the record's endorsement count as it does the volunteers'); draw only people with a line; drop the chapter heading over the Journal page; print nothing under a quiet paper's name, keeping the follow-nothing instruction; delete the labels this leaves unused.

**Time box.** 2 hours

**Rules.** Screen to mock: MENU-LOOK says no subtext and no filler, so a count is worded once and a section with nothing in it is left out. No hand-written player text: only labels already in controls.json are used and three unused ones are deleted.

**Done when.** A second session, in a drawn place and seed it names, asks for volunteers and endorsements and sees the campaign's count in words with no counter and no empty speech, opens the Journal and sees a chapter's title only in its row, and opens News with a paper that has printed nothing and sees nothing under its name; the three guard checks pass.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/campaign.ts,src/bench/ui/strips.mjs,src/bench/ui/news-board.mjs,src/bench/data/controls.json,src/bench/journal-news-no-repeat.browser.mjs (new)
