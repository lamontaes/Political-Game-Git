---
id: law-levels-wage-lists-mt-nd-nh-nv-vt
title: "Law levels: settle the local minimum-wage bar for MT, ND, NH, NV and VT from state code"
area: laws
kind: research
priority: 2
size: S
status: done
claimed-by:
pr: #7368
blocked-on:
source: added with npm run pool -- add
---

**What.** The two minimum-wage lists disagree on MT, ND, NH, NV and VT (docs/reports/law-levels-2026-11-05.md): the authority list bars towns there and the statute list does not.

**Rules.** Sourced from each state's code with the statute cited and a quote; never guessed; state level is exact.

**Done when.** Each of the five states is settled by a quoted statute, the two lists agree, and a test reads the five.

**Files.** data/research/laws/starting-law-2026/labor-workforce.json,data/research/laws/local-starting-law/local-minimum-wage.json

**Notes.** State Sessions Nov 6, one fetch pass, nothing changed in data. Vermont: 21 V.S.A. 384(a)(1) and 381 read in full, no mention of towns setting or barring a wage (so no bar found; sections 383 and 385-397 not read). Nevada: Nev. Const. art. 15, section 16 and NRS 608.250 only by summary, no political-subdivision bar seen, subsection 3 lets the Legislature set a higher minimum; confirm by reading both in full. North Dakota: NDCC 34-06-23 is titled Living wage mandate prohibition - Political subdivisions (bookmark title only, body unread); read the body to see whether it covers a local minimum wage. Montana (MCA title 39 chapter 3 part 4) and New Hampshire (RSA 279) could not be reached; the fetch hit a redirect and a 404 on guessed URLs. NELP and EPI trackers refused or 404.

Nov 7 (State Sessions, second fetch pass, nothing changed in data). Nevada: NRS 608.250 and Nev. Const. art. 15 sec. 16 read verbatim; neither mentions cities, counties or towns (sec. 16(3): the Legislature may set a higher minimum by law; sec. 16(8)(b) defines "employer" as any individual, firm or "other entity" without naming governments, so whether a city counts is open). The rest of NRS chapter 608 (608.255 to 608.690) was not read. Vermont: 21 V.S.A. 381, 383, 384 and 385 read verbatim; no section bars towns (384(b)(6) only exempts political-subdivision employees from the overtime rule); 386 to 397 were read by title only. Montana: mca.legmt.gov index loads but the Title 39 chapter index URL I tried is a 404; find the part 4 page from the index. North Dakota: ndlegis.gov/cencode/t34c06.pdf loads but its text could not be extracted, and the per-section PDF is a 404; N.D.C.C. 34-06-23 is titled "Living wage mandate prohibition - Political subdivisions". New Hampshire: gc.nh.gov RSA 279 URL 404s. Absence of preemption language in the sections read is not proof of none, so no flag was changed.

