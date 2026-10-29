---
id: play-stop-01-talk-says-nothing
title: "Every conversation is a greeting and a goodbye with nothing to say"
area: words
kind: bug
priority: 1
size: S
status: blocked
claimed-by:
pr:
blocked-on: play-stop-01-talk-says-nothing-a, play-stop-01-talk-says-nothing-b
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** On the v0.22.10 release I clicked my father John Stein at home and pressed Talk; he said "Talk to you soon." and the only buttons were Mark gap, Say nothing and Leave. My mother Paula Stein, the city treasury's Chief Administrative Officer, said "See you later." with the same three buttons. Eleven weeks into my campaign the game stopped me for a moment in a café with Noah Chan ("SOMETHING NEEDS YOU"); Talk gave "Hi." and "Have a good day." and nothing else, though the game opened that talk from a shared-cause moment about right to counsel in eviction. I expected a few things to say: ask my mother about the city, tell Noah why I am running, ask a voter for support. Say nothing changes nothing on screen.

**Rules.** Serves LAW.md §4, Scenes and conversations. This is a game, not a spreadsheet: meeting people and talking is golden-path step 2 and must give the player something to say. No hand-written player text: the choices come from the English engine and the moment's record (the shared cause), not typed strings.

**Done when.** The owner does the same steps on the next build and is not stopped: at home on the first evening and at a director moment with a stranger, Talk offers at least one thing to say that comes from the person or the moment (the shared cause by name), and the reply changes what the player sees. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/director/conversation.ts, src/director/scene-talk.ts, src/bench/handler.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md, log 15:54, 15:55, 16:09; screenshots 14, 17, 59). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was words. Split Oct 24 into play-stop-01-talk-says-nothing-a and play-stop-01-talk-says-nothing-b, each four hours or less; the CTO sets this item done when the last part is done. Oct 29, Words and director: PR 6764 makes a talk with nothing on record to say return no lines at all, where it said a greeting and a goodbye (the owner's Oct 24 'hi, have a good day. That makes no sense'); on clean main five of the fifteen talks in conversation.test.ts are exactly that. The screen side is still open: renderTalk in src/bench/play.mjs opens the talk box for a talk with no lines and always shows Say nothing (talkControls({ silent: true, ... })), against the Oct 27 ruling 'when there's nothing left to say, don't allow there to be a say nothing.'
