---
id: laws-starting-law-local-bars-not-matching-statutes
title: "Starting-law local bars that real statutes do not support (Tennessee county transit and police oversight; unsourced reserve and bottle-deposit rows)"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A research check of the starting-law local bars against statute text (Dev Tester, Nov 8, sub-agent with fetched sources) found the game bars what the law allows: a Tennessee county may set transit fares (Tenn. Code 7-56-101(b), so fare-free transit is allowed), may fund mass transit from the county aid fund up to 22.22 percent (54-4-103(e), so shifting highway funds to transit is allowed with that cap), and may create a police advisory and review committee on a two-thirds vote at two meetings with no subpoena power (38-8-312, so oversight boards are allowed in the state's template). The game bars all three flatly (data/research/laws/starting-law-2026/*.json preempts true, read by policy-authority.ts localPowerBarred). Two more rows have no support: a Tennessee minimum reserve balance (no statute found; the Kansas 79-2927(a) rule is a 5 percent cap on the non-appropriated balance, not a floor) and bottle deposit for Kansas and Tennessee (no preemption statute found). The Kansas pension cite should be K.S.A. 12-5002 for cities' own plans. The Tennessee work-requirement bar is right but for a different reason (the state runs the program).

**Rules.** No dice. Every changed answer is cited to statute text actually read, with URL and quoted line; read the statute yourself, the sub-agent quotes are from LawServer, ksrevisor.gov and capitol.tn.gov. Check what each flip does to the pass-a-law paths in a drawn Tennessee county before merging. Never name a state in logic; these are data rows.

**Done when.** The three Tennessee county answers read allowed or limited with the cited statute and cap; a drawn Tennessee county can pass fare-free transit and a police oversight committee through its own board in a played world; the unsupported rows carry an ESTIMATED tag or a statute; law-wiring and the starting-law tests pass.

**Files.** data/research/laws/starting-law-2026/, src/core2/policy-authority.ts, src/core2/data/laws/

**Notes.** Found by the Dev Tester, Nov 8 night, from the Plainview, Tennessee county run (seed 14241446a4f28c37e26d032f7c62bb07531b1aaa6ae2cd79ab563ebcfabc449f) and the worlds glimpses. Sources for all 11 Tennessee and 8 Kansas rows are in the Dev Tester report.
