---
id: words-tv-station-not-read-in-talk
title: 'A TV or radio station is "seen" or "heard" in talk, never "read in"'
area: words
kind: bug
priority: 3
size: S
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
source: Found while building #9279 (election results brought up in talk), Nov 14
---

**What.** Seen: a neighbor says "I read in KLYG-TV that Vincent Peterson won." and "I read in KQAP-TV that Karen Stark won."; a television station is said to be read.

**Cause.** Found in code: the `news.read` change row in src/director/data/bring-it-up-rows.json covers every outlet a person learns a story from, and the lines under it in data/english/parts/bring-it-up.json ("I read in {subject} about {topic}.", and since #9279 "I read in {subject} that {winner} won.") carry no condition on the outlet's kind, though the press module records it (`LocalKind` "newspaper" | "television" | "radio", src/core2/modules/press.ts). Measured: Sheridan, Wyoming (5669845), Arkadelphia, Arkansas (0501870) and Astoria, Oregon (4103150), worlds opened Oct 27, 2026 and run to Nov 10 (/mnt/project-files/words-lead/8831/part1-lines.md).

**Fix.** In `bringItUp` (src/director/bring-it-up.ts), set a fact for the outlet's kind from its press record (for example `paper` for a newspaper, `station` for television or radio) and have the bank's "read" lines require `paper`; the Story session writes the station lines ("I saw on {subject} that ...", "{subject} said ..."), listed by the builder. Where the player sees it: any talk that brings up a story or a result heard on TV or radio.

**Time box.** 2 hours for one Sonnet session at medium effort, plus the Story session's lines.

**Rules.** Lines under data/english/parts are the Story session's to write; a builder lists the lines it needs.

**Done when.** A second session, on main, talks to neighbors in a drawn place after a count, and no line says a TV or radio station was read; station lines say it was seen or heard.

**Waits on.** The Story session's station lines.

**Files.** src/director/bring-it-up.ts, data/english/parts/bring-it-up.json
