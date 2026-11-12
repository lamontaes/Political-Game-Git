---
id: laws-starting-law-local-bars-not-matching-statutes
title: "Starting-law local bars that real statutes do not support (Tennessee county transit and police oversight; unsourced reserve and bottle-deposit rows)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-laws-starting-law-local-bars-not-matching-statutes
---

**What.** A research check of the starting-law local bars against statute text (Dev Tester, Nov 8, sub-agent with fetched sources) found the game bars what the law allows: a Tennessee county may set transit fares (Tenn. Code 7-56-101(b), so fare-free transit is allowed), may fund mass transit from the county aid fund up to 22.22 percent (54-4-103(e), so shifting highway funds to transit is allowed with that cap), and may create a police advisory and review committee on a two-thirds vote at two meetings with no subpoena power (38-8-312, so oversight boards are allowed in the state's template). The game bars all three flatly (data/research/laws/starting-law-2026/*.json preempts true, read by policy-authority.ts localPowerBarred). Two more rows have no support: a Tennessee minimum reserve balance (no statute found; the Kansas 79-2927(a) rule is a 5 percent cap on the non-appropriated balance, not a floor) and bottle deposit for Kansas and Tennessee (no preemption statute found). The Kansas pension cite should be K.S.A. 12-5002 for cities' own plans. The Tennessee work-requirement bar is right but for a different reason (the state runs the program). Seen: the bill menu, where a town is barred from a bill the statute allows.

**Cause.** Found in code: the starting-law answers under data/research/laws/starting-law-2026/ bar a county's power where `preempts` is true, read by `localPowerBarred` in src/core2/modules/laws.ts (line 718) and used by src/core2/policy-authority.ts. The Dev Tester (Nov 8) found three Tennessee county rows that statute does not support: fare-free transit (Tenn. Code 7-56-101(b)), shifting highway funds to transit (54-4-103(e), up to 22.22 percent of the county aid fund) and a police oversight committee (38-8-312). The files have been edited since, so check each row as it stands before flipping it (the transit-shift row already cites the 22.22 percent fund).

**Fix.** Set the Tennessee county rows to allowed or limited with the cited statute text and cap, tag the two unsupported rows (a Tennessee minimum reserve balance, a bottle deposit for Kansas and Tennessee) ESTIMATED or give them a statute, correct the Kansas pension cite to K.S.A. 12-5002, and check what each flip does to the pass-a-law paths in a drawn Tennessee county.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. Every changed answer is cited to statute text actually read, with URL and quoted line; read the statute yourself, the sub-agent quotes are from LawServer, ksrevisor.gov and capitol.tn.gov. Check what each flip does to the pass-a-law paths in a drawn Tennessee county before merging. Never name a state in logic; these are data rows.

**Done when.** A second session, not the builder, plays a drawn Tennessee county (place and seed named) and sees its own board pass fare-free transit and a police oversight committee in a played world; the three county answers read allowed or limited with the cited statute and cap; the unsupported rows carry an ESTIMATED tag or a statute; and the law-wiring and starting-law tests pass.

**Waits on.** Nothing.

**Files.** data/research/laws/starting-law-2026/, src/core2/modules/laws.ts, src/core2/policy-authority.ts

**Notes.** Found by the Dev Tester, Nov 8 night, from the Plainview, Tennessee county run (seed 14241446a4f28c37e26d032f7c62bb07531b1aaa6ae2cd79ab563ebcfabc449f) and the worlds glimpses. Sources for all 11 Tennessee and 8 Kansas rows are in the Dev Tester report.

Released (2026-11-11): Cause no longer holds on main: the rows were corrected after the Nov 8 finding. Tennessee fare-free transit (transportation-infrastructure.json line 1414) cites 7-56-101(b) and grants, the transit shift (line 1067-1070) cites 54-4-103(e) with the 22.22 percent cap, civilian oversight (justice-public-safety.json) cites Title 38 ch. 8 with preempts false, bottle deposit for Tennessee has preempts false with its weak-support note, and the Kansas pension row cites K.S.A. 12-5002(a) (fiscal.json line 3603). Not checked: the Tennessee minimum-reserve-balance row's wording (preempts false) and the Kansas bottle deposit row. Continue on branch claude/pool-laws-starting-law-local-bars-not-matching-statutes.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:24 UTC) on branch claude/pool-laws-starting-law-local-bars-not-matching-statutes.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-laws-starting-law-local-bars-not-matching-statutes.
