---
id: dev-mode-why-a-reply-was-offered
title: "Dev mode cannot show why a scene offered a reply, or why it left one out"
area: words
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: vote-reasons thread
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: owner, Nov 16 00:59Z (dev mode does the tracing in the game); Account lead's reading for the vote-reasons thread
---

**What.** A builder tracing why the reporter's call after a vote offered "I voted no because I don't believe in it." and not "It wasn't right for {place}." had to read the code and run scripts. Dev mode shows the vote's reasons term by term: the why panel and the trace on the member's vote row (`memberPosition`, the position's parts and their sum). It does not show the scene's facts, with the records they cite, or the use behind each reply: which facts that use required or excluded, which `after` it followed, and which wordings tied and lost.
Seen: on the reporter's call after a council vote at Island Pond, Vermont (5035725, pr-44:0) and Bagdad, Arizona (0405140, yes-vote-6:0), traced for #9584 by script only.

**Cause.** Found in code: `fitting` in src/english/scene-talk-words.ts picks a spot's wordings by the facts a use requires and excludes, and `purposeScene` in src/director/purpose-scene.ts builds the facts, but neither keeps nor serves the reasons. No dev panel (src/bench/ui/dev-scene.mjs lists only what can start a scene type) reads them.

**Fix.** Serve, for a scene the player has open, its facts with the record ids each cites, and for each reply in the tree the use that placed it: its required and excluded facts, its `after`, and the other wordings that fit the same spot. Read them from `fitting`, with no second picker. Show them in dev mode beside the scene, worded through the English banks' labels. Link each fact's record id to the trace box, so the vote's reasons term by term are one click from the reply that cites them.

**Time box.** 3 hours, one Opus session at medium.

**Rules.** Ask why: each reply's reason is the use and the facts that placed it, cited by record id, read from the same `fitting` call play uses. No hand-written player text: the panel's labels come from the English banks. Every effect can be triggered and traced in dev mode (owner, Nov 14 and Nov 16).

**Done when.** In a played world built by `buildBenchWorld` at the pinned place Island Pond, Vermont (pr-44:0), the player votes no on a colleague's bill and opens the reporter's call. Dev mode shows `top-reason-own-view` cited to the roll's record id. It shows "I voted no because I don't believe in it." placed by a use that requires it, and "It wasn't right for Island Pond." beside it as another fit. A second session opens the same call in the running game's dev mode and sees the same.

**Waits on.** Nothing.

**Files.** src/english/scene-talk-words.ts, src/director/purpose-scene.ts, src/bench/ui/dev-scene.mjs

**Notes.**
