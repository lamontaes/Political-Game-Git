---
id: words-scene-web-executive-pass-1
title: "Scene web, the executive, pass 1: the signing and the recall petition from real lives, and the recall table without invented storefronts"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: words/web-executive
pr: 6332
blocked-on:
source: "words-and-scenes lead, Oct 27: first pass of words-scene-web-the-executive"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The first pass of the executive domain of the scene web. Two packets from real lives cover a bill signing with people in the room and a recall petition against a local official. The recall scene's narration stops naming a grocery store and a post office, and its ask stops claiming a harm no fact carries. The cast and engine gaps go to their leads.

**Rules.** Serves `scenes-from-life`: a packet per episode, no real name or line ships. Ask why: each gap names the record and the code that doesn't read it. One rule, all 56 places: the recall table stands "on your way through town", not at a storefront the place may not have.

**Done when.** Two packets in `docs/design/scenes/from-life/` name their types, and `npm run scene-web` (buildBenchWorld, drawn place and seed named) links them for bill-signed and recall. `scene-signing-casts-who-it-reaches` (lead director) and `recall-reply-moves-the-drive` (lead laws-effects) are filed. Three recall lines are rewritten. `english-parts-banks` and `scene-talk.test.ts` pass.

**Time box.** 3 hours.

**You will see.** At the petition table: "We're collecting signatures to recall you. You voted for {bill}. That's why."

**Screenshot.** The executive section of `docs/reports/scene-web.md` in the PR body.

**Files.** docs/design/scenes/from-life/, data/english/parts/scene-talk.json, docs/reports/scene-web.*

**Notes.** Part of `words-scene-web-the-executive`, which stays open (appointment and desk-bill wait on the packets in #6256 and #6303).

Oct 29 (CTO): set done; PR #6332 merged (the done flip failed while branch protection refused the flip job's push).
