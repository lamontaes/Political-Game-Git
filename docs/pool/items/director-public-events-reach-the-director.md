---
id: director-public-events-reach-the-director
title: "The country's big public events reach the people the player knows as stories they read, so someone in the player's life can bring them up"
area: director
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** The owner wants people in the player's life to bring them news of the world after a big public event, his example a friend calling after the president's speech. A person can only bring up what they learned (the standing rule "Ask why"), so the catch-up starts from a story the person read, not from the raw event. Most national records already reach the national desk and its readers; the President's approval, which the nation module keeps every month, is never published, so no one in the game can read or talk about it.
Seen: in a played year, the paper's national pages carry the month's approval poll beside the disasters, nominations and addresses they already print, and the people who follow those outlets are listed as having read it.

**Cause.** Found in code: national records reach readers through the press desk (src/core2/press-desk.ts, the national tier and `nationalCarries`, line 59) and each reader's read is a `news.read` event naming them (src/core2/modules/news.ts, `NEWS_READ`, line 157, emitted around line 734), which circumstance rows already use as a scene cause (src/director/data/circumstances.json, read by src/director/circumstance.ts). Another state's disaster is emitted as a public news record (src/core2/modules/national-events.ts, `emitDue`, line 471, kind `national.disaster`), and cabinet nominations and the President's addresses are public records (src/core2/office-day-federal-president.ts). The monthly approval (src/core2/modules/national-opinion.ts, `ApprovalRow`, line 33) is kept as a row and emits nothing. The federal courts keep counts and no ruling (src/core2/modules/federal-courts.ts, header), so there is no ruling to report.

**Fix.** First list, from a played year at a pinned place, each national record kind the national desk printed and how many people in town read each (by `news.read`), and put that list in the PR body. Then close the one gap: when the month's approval row is written, emit one public news record for it (`publicRecord: true`, `news: true`, the month's percent and its change as facts, sourced as the row is), so the national desk can print it and its readers read it. Add no `eventImpacts` row and no scene: the catch-up item reads `news.read`. Courts stay out until the courts keep rulings. Where the player sees it: the national page of the paper, and the Journal's list of what people read. Dev mode shows it: Advanced's Trace on the month's approval record follows it to the printed story and its named readers (`news.read`); where the trace stops at the record, the PR extends it, reusing the trace that exists, and names the screen.

**Time box.** 3 hours for one Sonnet session, one PR. It waits on nothing.

**Rules.** Ask why: a person can bring up only a story whose read names them, so nothing is said from the raw event. Cadence and summaries: one record a month, written when the row is, never a daily scan.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year and sees the President's approval printed on a national page each month it is written, finds named readers of it by `news.read` id, and the year still runs under two minutes; Advanced's Trace on an approval record shows the story that printed it and its named readers.

**Waits on.** Nothing.

**Files.** src/core2/modules/national-opinion.ts, src/core2/press-desk.ts, src/core2/modules/news.ts
