---
id: words-rewrite-queue-nov10
title: "The five lines #8117's rules pulled on main are rewritten so they play again: two opening-speech 'this town' lines and three family-filing money questions"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8169
blocked-on:
lead: words
source: data/english/pulled.json on main after #8117 and #8124 (Nov 10), the rewrite queue the CTO's 12:20 p.m. line hands to Story
claimed-at:
merged-at:
---

**What.** After #8117 merged, `npm run words:rules` pulled five lines from play on main. Two opening-speech `story-says` lines broke `no-this-town` ("Prices in this town have climbed…", "Prices in this town have eased…"), from the owner's Nov 9 note on his town address. Three `family-filing` questions from a spouse broke `no-figures-people-would-not-know` by quoting how long the savings last ({cushion}) and how long the race runs ({remaining}); the owner asked for the plain question instead: "Can we even afford this?" Each is rewritten under its own key, from the same facts, so the rules pull nothing.

**Rules.** No hand-written player text in code: the rewrites are bank pieces. One rule, all 56 places: the town-address lines say "across town" and "around town" (the state address already says "Prices here…" word for word, and every text in a bank differs), since the opening-speech bank's `{place}` slot is a state the President campaigned in, not the town; naming the town needs a town slot from the composer, which is Fable's side.

**Done when.** `npm run words:rules` on the branch leaves `pulled` empty in data/english/pulled.json; english-parts-banks and the English guards pass; the filing and address scene tests pass on seed 11.

**Files.** data/english/parts/opening-speech.json, data/english/parts/scene-talk.json, data/english/pulled.json

**Notes.** Not seen in the game (2026-11-11, second-session-2): seed 11 draws (Yigo, Guam for the kinds test), seed 11, main b7e99500: words:rules leaves pulled empty and the banks pass, but opening-address.test.ts and opening-address-kinds.test.ts each fail one test at seed 11 so the address scene tests do not pass
