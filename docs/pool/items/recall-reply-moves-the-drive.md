---
id: recall-reply-moves-the-drive
title: "What an official says to a recall petitioner moves the drive: signatures, the vote or a resignation read it"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/recall-reply-moves-drive
pr: #6495
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web executive pass (packet the-recall-petition)"
lead: laws-effects
milestone: play-first
claimed-at: 2026-10-28T00:35:07.371Z
---

**What.** The recall scene stages the official at a petition table, but the reply (answer the charge, dismiss it, reach out, fight) is read by nothing. No stance moves the drive's signatures or the recall vote, and an official can't resign. The recalls engine (`src/core2/modules/recalls.ts`) also admits only city, county and township seats, so a school board member is never recalled, and a drive has one organizer and no volunteers. The packet `docs/design/scenes/from-life/the-recall-petition.md` (a school board recall, calibration only, from news summaries) shows the officials mostly answering in public, not at the tables.

**Rules.** An effect is a read: the reply writes a stance the drive's signature count and the voters' views read, and a resignation ends the drive. No dice. One rule, all 56 places: which seats may be recalled is each place's own law data.

**Done when.** In a buildBenchWorld drawn place (seed named), a recall drive against a full-person official stages the scene, and the official's reply is written as a record. The drive's next signature count reads it in its reasons. A test fails when the reply is written and the count's reasons don't cite it.

**Time box.** 4 hours.

**You will see.** You stop at the petition table and answer the charge; the next count of signatures shows fewer people signing after your answer, and says why.

**Screenshot.** The recall scene and the drive's count after it, from a drawn place.

**Files.** src/core2/modules/recalls.ts

**Notes.** Related: `gov-recall-for-cause-start` (a for-cause recall from a reported scandal).

Oct 29 (CTO): set done; PR #6495 merged (the done flip failed while branch protection refused the flip job's push).
