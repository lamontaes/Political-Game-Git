---
id: meetings-resident-player-speaks-at-public-comment
title: "A player who is not on the board can sign up and speak at a council's public comment"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: fable
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A resident player has no way to attend a town or county board meeting and speak at public comment, so the work in #8938 (every speaker on the record meets the members who heard them) can only be reached by a seated member or by calling the engine directly. A player who is not on the board never sees an agenda, never gets a sign-up, and never meets the members this way. Seen: a meeting entry a resident player reaches from Calendar or Travel, with a sign-up to speak for or against an agenda item, and afterward the members shown on People. Seen: the meeting panel a resident player opens from Calendar or Travel, with a speak for or against control on each agenda item.

**Cause.** Found in code: src/core2/modules/meetings.ts line 299, signUpToSpeak, is called only by speakOnItem (src/core2/modules/office-day.ts line 628), which requires the meeting's playerPresent flag; playerPresent is set only in holdPlayerIfDue, which returns unless the player sits on the body. meetingInProgress (office-day.ts) and the bench routes /api/meeting and /api/meeting/speak (src/bench/handler.ts, src/bench/play.mjs) read only that flag. No Calendar entry, Travel place or scene lets a non-member attend. Played check South Woodstock VT, seed d9e1, Nov 13: the player had to be signed up by a direct engine call.

**Fix.** Let a resident player attend a posted meeting of their own town or county body: add the meeting to the player's Calendar and Travel from the posted meetings row, set playerPresent for that player without making them a voter, and show the existing meeting panel with the agenda and the for-or-against speak control only (no vote, no take-up). Reuse speakOnItem's signUpToSpeak call and the meeting clock hold; do not add a second sign-up path. No new engine.

**Time box.** 4 hours

**Rules.** One engine per mechanic: reuse the meetings and office-day engines. No dice: who speaks is the player's choice. Wire to the world: prove a resident player speaks in a drawn place and the members meet them. Player-screen-text: all words come from banks and control names.

**Done when.** A second session sees it in the running game: in a played year in a drawn place and seed the builder did not choose, a resident player who is not on the body opens a posted meeting from Calendar or Travel, speaks for or against one agenda item, and afterward the body's members appear on People and each member's tie cites the public comment record by id; the speed:year time is no more than 20 percent over main.

**Waits on.** Nothing

**Files.** src/core2/modules/office-day.ts, src/core2/modules/meetings.ts, src/bench/office.ts, src/bench/handler.ts, src/bench/play.mjs
