---
id: play-stop-02-developer-text-on-play-screens
title: "Code labels, status codes and raw dates show on the player's screens"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Playing the v0.22.10 release, developer text reached the player on at least eight screens. The talk box always carries a "Mark gap" button. News shows "REGION · 2025-01 unemploymentPct 4.4 · jobsThousands 6909.0 · hourlyEarnings 30.3 · priceLevelPct 92.9" and public records reading "Press.archived" and "Official appointed" with no names. Politics lists council members as "1999-01-01 – 2027-01-01 · in office at the opening · 2022-11-08 60%" and my party as "Views fit 0.91". The filing panel reads "FILING-DEADLINE 2025-02-08 / 2026-08-17", "ALREADY-FILED not filed / one filing per contest", "MINIMUM-AGE 18 / 18". After I filed, the city secretary's line was "on-ballot", and Campaigns is headed "ON-BALLOT · COUNCIL 0 2026-11-03". I expected plain words: dates as "November 3, 2026", "You are on the ballot", no Mark gap in the installed game.

**Rules.** No hand-written player text: these lines must come from the English engine or show record data in plain labels, never field names or status codes. American English everywhere: dates as November 3, 2026, not ISO strings.

**Done when.** The owner does the same steps on the next build and is not stopped: on News, Politics (Government, Campaigns), the filing panel, the city secretary's reply and every talk box, no field name, status code, ISO date or Mark gap button appears in the installed build. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/filing.ts, src/bench/campaign.ts, src/bench/government.ts, src/bench/economy.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:54, 15:57, 16:02, 16:03, 16:04, 16:05; screenshots 14, 24, 31, 39, 44, 46, 48.
