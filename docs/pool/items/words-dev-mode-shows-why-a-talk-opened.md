---
id: words-dev-mode-shows-why-a-talk-opened
title: "Dev mode shows why a talk opened on its subject, which lines were in the running and why one was picked"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Owner, Nov 16 ("if it's not already being traced by the dev mode, it should be... you don't have to look at the code every time"), relayed by the Account lead
claimed-at:
checked: words builder A 2026-11-16
---

**What.** To learn why a talk opened on its subject, which lines were eligible and why one was picked, a session reads code or runs a script; dev mode (src/bench/ui/dev-*.mjs) shows no such chain for a talk. Seen: no talk trace in the dev views listed in src/bench/ui/dev-view.mjs, dev-person.mjs or dev-watch.mjs. Seen: after a talk opens, dev mode's Trace line for that person names the record that caused the talk, the subject chosen, each line in the running with why it was held back or lost, and the line picked.

**Cause.** Found in code: the talk engine (src/director/conversation.ts) picks the opener, the subject and each reply from the bank by facts and the heard-today list, and keeps only the picked line's part and slot record ids; the lines passed over and the reasons are computed and dropped, so nothing in dev mode can read them.

**Fix.** Keep, for the player's talks only and only while dev mode is on (bookkeeping is a debug switch), the candidates and reasons the pick already computes, through the existing trace the dev views read; add one "Why this talk" line to the dev person view naming cause record, subject, candidates with reasons and the pick. No second pick path and no copy of the picker's rules in the view.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** One engine per mechanic: the view reads what the picker kept. Bookkeeping off in play: no cost when dev mode is off (speed:year unchanged). Pinned place and seed.

**Done when.** At Sheridan WY, seed 7, dev mode's person view shows, for a talk opened in a test through the bench's routes, the cause record id, the subject, at least two candidates with a reason each and the picked part id, matching the lines the talk said (test, red before, green after), and `npm run speed:year` is not slower with dev mode off. A second session (not the builder) opens a talk at a drawn place from all 56 (place and seed named), turns dev mode on and reads why the talk opened and why that line.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/bench/ui/dev-person.mjs
