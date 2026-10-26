---
id: words-scene-for-unstaged-big-moments
title: "Big moments that no situation stages get a scene: a heard speech that changed your views, a candidate's debate speech"
area: words
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: words/unstaged-big-moments
pr: #6136
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T02:29:51.323Z
---

**What.** Once #6126 (play-stop-26) lands, a moment stops the player's day only when a situation stages a scene for it. Big moments that no situation type stages then reach only the journal. #6126's two-year probe in Murraysville, North Carolina (seed stops-a) names two on main, on September 10 and October 27, 2026: a heard speech that moved the player's views, and a candidate's speech at a county board debate, whose scene was bound to nothing. The player never meets the person behind either moment.

**Rules.** Words engine: the director stages situations from records, the English engine says them; nobody is drawn without a reason on record. Wire to the world: each scene reads the moment's own record (the speech, the debate) and names who gave it. One rule, all 56 places.

**Done when.** A played year in a drawn place (seed named) lists every moment label whose impact would stop the day but that no situation stages; each listed label either gets a situation type in situation-types.json with its words in the banks, or is named in the PR body with the reason it stays a journal line; the heard-speech and debate-speech moments stage scenes with the speaker present, shown by record id.

**Files.** src/director/data/situation-types.json, data/english/parts/scene-words.json, data/english/parts/scene-talk.json, src/director/scheduling.ts

**Notes.** TODO
