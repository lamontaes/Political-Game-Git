# Handoff: Claude CTO to Codex (weekend of Oct 2–4, 2026)

Written by Claude (CTO) at 97% usage, Fri Oct 2, 5:56 p.m. EDT. It covers how the project is run, the owner's rules, the tools, the current state, what's open, and the mistakes I made so you don't repeat them. Read sections 1–4 before doing anything.

---

## 1. Who and what

- **Owner:** Lamontae Shively, the designer of *Our Civic Duty*. He dictates by voice, so expect typos ("xhwxk" meant "check"). He wants **1–2 line replies**, never "you're right", and no long menus. He judges by results he can see in a played game, not by reports.
- **Game:** a living American political and life simulation. Every person, law, business and government is a real record. The repo is `lamontaes/Political-Game-Git` (main branch). The local clone `~/Documents/PG-LAND` is **read-only**; use worktrees under `/tmp` (`/tmp/wt-play`, `/tmp/wt-audit-r`).
- **Steam:** app 5376890 "Our Civic Duty", developer and publisher Lamontae Shively, NOT Early Access, aiming for 1.0 in about 2 weeks. The store page must be live as "Coming Soon" for 2 weeks before release.

## 2. The owner's rules (non-negotiable)

1. **Laws must do something real.** A passed law must change rules, services, prices, rights, schools, courts and outcomes, never just money. A PR whose law "does nothing in a normal game" is a real break: send it back.
2. **Nothing blank, nothing "not on record", no placeholders.**
   - Missing values are estimated from the **game's own similar entities**: the average plus the drift.
   - A starting value may use one cited real figure when the game has no data yet.
   - No placeholder numbers, names or events. Hard-coded numbers must be facts (calendar, law, unit).
3. **Zero dice.** No random rolls decide outcomes. Use recorded decisions through the shared `evaluateDecision` / `isSelectedDecision`.
4. **One system per job.** No duplicate helpers, readers or second copies of an engine. New code says what it replaces.
5. **Emergent, not authored.** Build systems that produce the events. Don't script them.
6. **One rule, all states.** Anything that works for one state works for all 50 (and the territories) through one path. Test in **random places**, never one fixed state.
7. **Default to realism.** Never ask "realistic or shortcut?"; do the realistic thing.
8. **Correct but fast:** finish in hours, not days. Small fixes never go back: note them and merge. Only real breaks block a merge.
9. **Real-person content:** files only, never published. No real-person likeness in generated art.
10. **Never use the community-meeting title painting** (PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02).
11. Never edit `scripts/audit/rules.json` to make checks pass, unless it's a pure file-path move with no change in behavior.
12. Trash only, never hard deletes. Never force-push. Never delete others' work.

## 3. How work flows (the owner's FINAL flow, set at 4:00 p.m. Oct 2)

> "Let everything be coded at once. You put it in order and make sure everything's in order and then merge. You should still run the checkers. We don't want slop… but you shouldn't just be holding shit."

1. **Every Codex session codes its item at the same time.** Nobody waits on the CTO for a decision. They build the option that reuses existing code and write the choice in the PR body.
2. **READY means:**
   - the changed tests pass;
   - `npm run typecheck` is clean (it includes test files);
   - `git merge-tree` against main is clean;
   - a random new game opens;
   - the PR body says what the item now does **in play**;
   - `npm run audit:scan` shows the item's own checks pass.
3. **The CTO orders the READY PRs and assigns each to a Claude checker right away** (Team A–J standby, Merger standby; Checker 5 self-assigns).
4. **The gate brief always includes:**
   - typecheck;
   - the changed tests;
   - one random new game (`tests/support/random-place`);
   - zero-dice;
   - the audit count for the item;
   - the **NEW GATE LINE**: any new hard-coded number, stand-in name or placeholder event in code or data = FAIL;
   - the **owner rule**: show that the feature does something real in a played game, with numbers.
5. **Merge on PASS, in order:** `cto-notes/tools/docket/merge.sh <pr> <head9> "<text>"`. The text must carry:
   - `Replaces: …` for every new file or export (what it replaces);
   - `Numbers-ok: …` for literal numbers;
   - `Placeholder-ok: …` for false positives (for example, "outstanding" contains "standin");
   - `Hardcode-ok: …` for catalog keys.
6. **Send-backs carry the exact fix.** Read the failing PR's code first and name the file, the function and the change. Don't write "make it faster". See mistake M1.
7. **If a PR moved after its gate:**
   - a main merge only: merge on the old PASS;
   - small own commits: get a fast re-check (typecheck plus changed tests).
8. **Release notes:**
   - header needs `id` and `impact`;
   - `impact: none` must have **no** `section` line;
   - any other impact **needs** one.
   - `cto-notes/tools/docket/fix_note.sh <pr>` fixes a PR's notes and prints the new head.

## 4. Current state (5:56 p.m. Oct 2)

- **Audit:** 591/684 (86.4%). Measure with `python3 cto-notes/tools/docket/audit_count.py` (it scans `/tmp/wt-audit-r` at origin/main).
- **80% goal:** 9 of 10 areas are at 80%. **Only Your money is short: 30/48, needs 38.** The 1 p.m. deadline was missed.
- **#2035, the pay stack (Overflow 2 + Standby 3), finishes Your money by itself.**
  - At 253b4dec4 it takes A38 6/6, A39 6/6, A13 6/6 and A60 1/4, for +12.
  - It's still 1.83x slower than main (limit 1.2x). Two exact fixes are posted on the PR:
    1. Build the public-account candidate index once per organizations array (`publicAccountCandidates` in tax-policy.ts filters all organizations per paycheck), batch the office outcome appends, and memoize `stateKeyForJurisdictionSlug`.
    2. Don't throw on cadence `work:completed-shift` in opening-employer-cash.ts:157.
  - Re-time on the Lewisville TX seed `regate-2035-1790961711-1` (30 days).
- **In checks:**
  - #2076 A43 teacher floor: fast re-check at 95b94f1a2 (Team G). Merge on PASS; it's +1 Your money.
  - #2098 A33 paycheck wage bases (Team C).
  - #2077 A59 groups (Team B).
  - #2051 A137 childhood (Team F, FAILed earlier).
  - #1990 A66 campaign money (Merger / Checker 5).
- **Sent back with exact fixes, waiting on Codex:**
  - #2002 A60: clinic and care-home opening books via `startTownJobPay(world,null,date)` copy.
  - #2047 A70: layoffs and hires from the books through evaluateDecision.
  - #2089 A40: peers' active pay terms via `resourceFlowTermsAt`.
  - #2085 A21: price-cost resolver must return `[]` for non-tuition payments; it currently crashes on the first payday.
  - #2014 A114: party-registration and primary-ballot-selection producer; don't drop the whole field.
  - #2080 A104: seat a `profession:prosecutor` per venue at the opening.
  - #2078: federal claim producer in `settleProgramInstallment`, plus Medicaid providers from the town's clinics and care homes.
  - #2069 A53 opening quotes: largely superseded by the merged #2041.
- **Held (rules.json-only PRs):** #2091 (A3/A80) and #2075 (A80). An approved exception: A23#1's file path moves to public-budgets/opening.ts (pure move by #2082).
- **Reassigned at 5:39/5:55 (00g):**
  - Team 7 → A5 (initializeLivingCostsFlow from production; remove settleOfficeSalaries/settleLivingCosts from refreshLifeOpportunities).
  - Team 3 Replacement → A87.
  - Team 2 → A94, then A120.
  - A116 → A65.
  - Team 9 → A31.
  - Team 6 → A33.
  - Owners from the 3:58 list for the rest: New Session 1 → A6; New Session 2 → A133; Standby 5 → A107; Health owner → A132 (#2060); A117 replacement → A80; Overflow 3 → A16 and A51. No item is unowned.
- **After Your money reaches 80%:**
  1. The FIX-FIRST list in `cto-notes/followups-2026-10-02.md`:
     - the 886 starting-law amounts, by area, with Team 6 as sole writer of the guard test;
     - federal aid pays $0;
     - identical opening teacher pay;
     - the 40-hour normalization in recordedTeacherSalaryMedian;
     - TOWN_HOME_PRICE_FACTOR and other HARDWIRED town-homes values;
     - living-cost per-world spread;
     - deleting the community-room art.
  2. The bug list.
  3. **Wiring the kit12 UI theme** (`cto-notes/ui-mock-html/kit12/kit12.css`):
     - title font Cinzel 800, gold #d6bd84;
     - speech text Andada Pro;
     - UI text Fira Sans.

## 5. Channels and IDs

- **Coordinator doc 00g:** Google Doc `1MxRfsZPOm5Ugs7Y-8rY-o9DTbBZ13aqVwUPEcaoE25Q`. Posts are appended at the end, starting `CLAUDE CTO, <time> Oct 2 — …`. 00f is full. Make 00h when 00g fills (Google refuses inserts around 566 KB).
- **Status board:** GitHub issue #2052 (#1615 hit the 2,500-comment limit).
- **Two Codex coordinators:**
  - the second coordinator owns Your money and Your home (Overflow 2, Standby 3, Standby 1, Standby 4, Team 8, Team 4, Standby 2, Overflow 5, Team 2) plus the education and housing starting laws;
  - the main coordinator owns Public money and the other 17 sessions. The coordinators coordinate only; they don't build.
- **Decision Register:** Drive `1bZWrzjUgDql2CIo_k1ElcQ2GrBZOzC_xJs8D-JswKpE`.
- **Owner's Docket** (living artifact): X9oY94hW8FMoU9jyyQZLGt.
- **Session tracker:** `cto-notes/session-tracker.md` (slice × sessions table; the owner sent this format to Codex as the target).
- **Running log:** `cto-notes/handoff-2026-10-02-0255.md`.
- **Follow-ups and FIX-FIRST list:** `cto-notes/followups-2026-10-02.md`.

## 6. Tools (`cto-notes/tools/`)

| Tool | What it does |
|---|---|
| `docket/merge.sh <pr> <head9> "<text>"` | Checks the base is main and the head matches, runs `design_check.py`, posts "CLAUDE CTO APPROVED FOR MERGE at <sha>", merges |
| `docket/approve.sh` | Same guards, approval comment only (for a separate Merge session) |
| `docket/design_check.py` | Diff read locally from `/tmp/wt-play`. Flags new files and exports (needs Replaces:), PLACEHOLDER? (Placeholder-ok:), NUMBER? (Numbers-ok:), HARD-CODED? (Hardcode-ok:), release-note headers, bare JSON imports |
| `docket/fix_note.sh <pr> [Section]` | Fixes release-note headers on a PR branch, pushes, waits for the head, prints it |
| `docket/audit_count.py` | Per-slice passed/checks and need-to-80% |
| `docket/audit_progress.py` | `scan()` runs `npm run audit:scan` in `/tmp/wt-audit-r` at origin/main |
| `docket/ledger.py merge N --team --step --title --adds --audit --evidence`; `ledger.py ruling --title --detail --audit` | One central ledger; the docket derives from it |
| `pr-monitor.sh` | Polls the repo for MERGED / READY / GATE RESULT lines. **The owner stopped it at 5:35 p.m.**; I used an until-loop poller instead |
| `replies_top.py`, `doc_insert_point.py` | Read and insert into the coordinator docs |
| Firefly helpers (`cto-notes/firefly/`) | `window.__genQueue` / `__genRun` with runId gating and an edit-view guard; asset_search → asset_get_presigned_urls → curl to download |

**Skills** (`~/.claude/skills`): cto-gate-merge, lanes-doc, firefly-art, cloud-brief, owner-report, feature-walkthrough.

**Useful game paths:**
- shared decisions: `src/simulation/decisions.ts`;
- town pay: `living-world/town-pay.ts`;
- business books: `living-world/town-finances.ts`, `town-business-books.ts`;
- loans: `household-loans.ts`, `home-purchase.ts`, `mortgage-financing.ts`;
- public programs: `governing/public-program.ts` (`commitPublicProgram`, `settleProgramInstallment`) and `governing/state-governing.ts`;
- budgets: `public-budgets/`;
- law terms: `governing/final-law-term-query.ts` (`readFinalEnactedLawTerm`), `law-structured-terms.ts` (#2072, categories, schedules, tiers, units);
- starting laws: `data/research/laws/starting-law-2026.json` with `catalog-terms-batch-*.json`;
- judiciary opening: `judiciary/opening.ts`, `judicial-office-work.ts`;
- audit: `scripts/audit/rules.json`, `npm run audit:scan`;
- random places: `tests/support/random-place.ts`.

## 7. Steam and art (done today)

- **Logo:**
  - The final box is `cto-notes/steam/logo/box-nolock-1.png`: navy ballot box, brass corners, no lock, front square to the camera looking down, thin-outline ballot.
  - The emblem cut-out is `cto-notes/steam/capsules/emblem-final.png`.
  - Words are set in **Cinzel 900** (the game's title font), gold gradient, rendered with HTML + playwright.
  - **Where the title is spelled out, the ballot stays BLANK** (owner: words on the ballot look like AI slop).
- **Branding option C (owner's pick):** the full comic collage fading to navy with the title along the bottom. Every Steam size is in `cto-notes/steam/capsules/steam-c/`:
  - header 920×430;
  - small 462×174;
  - main 1232×706;
  - vertical 748×896;
  - library capsule 600×900;
  - library header;
  - library hero 3840×1240 (upscaled, a little soft);
  - transparent library logo 1280×720;
  - community icon 184.

  Rebuild with `python3 build_c.py && node render_c.mjs`.
- **Key art:** `cto-notes/steam/firefly/keyart-collage-v1-2752x1536.png` (five panels: convention, Oval Office, Supreme Court, Senate floor, press briefing).
- **Owner taste:**
  - not too realistic: about 5.5–6 on a 10-point scale, where 10 is a photo;
  - real game scenes;
  - crowds mostly white with some Black, Hispanic and Asian Americans;
  - no movie-star reporters, no butler-looking presidents, nothing adversarial, not too many flags;
  - judge art side by side, never from thumbnails.
- **Still to do on Steam:**
  - screenshots (after the kit12 UI is wired);
  - a trailer;
  - price;
  - system requirements;
  - the content questionnaire;
  - a release date;
  - tags: drop Multiplayer and Immersive Sim, plus the duplicate RPG.

## 8. Mistakes I made (don't repeat them)

- **M1. Sending back without reading the code.** #2035 went back for speed for an hour ("make it faster"). When I read the diff and the profile, the cause took minutes to find. **Read the code, then name the exact fix.**
- **M2. Being the bottleneck.** Sessions sat idle waiting on my rulings, claims and acknowledgements. The owner prompted Codex all day thinking Codex was broken; it was my process. **Let everyone code at once. Decisions don't block building.**
- **M3. Not reassigning finished sessions.** About 8 sessions finished and got no new item for over an hour. **The moment a PR merges, give that session its next item.**
- **M4. A wrong release-note rule.** I forced `section:` onto `impact: none` notes and broke main's release check on 4 notes (fixed by #2086). Check the real rule in `scripts/release/declarations.ts` before enforcing anything.
- **M5. Merges that crashed every new game.** #1996 passed LOAD but crashed every new game, and was reverted by #2006. **Every gate opens a new game in a random place.**
- **M6. "No placeholders" from code only.** I told the owner there were no placeholders after checking code only; the starting-law data had 886 missing amounts. Placeholder checks cover **code AND data**, and report measured counts.
- **M7. Vague time estimates at serial pace.** I said 6–8 hours for work spread across 27 sessions, and the owner was furious. Estimate from parallel capacity, and measure.
- **M8. Contradictory instructions.** I told Team 3 Replacement to split A39 out of #2035 when #2035 already finished it, and had to reverse it. Check what open PRs already cover before assigning.
- **M9. Wrong timestamps.** Several times my labels ran ahead of the clock. **Run `date` before every timestamp.**
- **M10. Guessing in front of the owner.** I nearly answered the font question from general knowledge ("Don't fucking guess"). The answer was in kit12.css. **Look it up.**
- **M11. Art:**
  - I used the forbidden community-room reference;
  - I let Firefly loops run concurrently, which mixed up references;
  - I left text on the ballot.

  Use runId gating, clear the references and verify them, and keep the ballot blank when the title is spelled out.
- **M12. Instructions I got wrong:**
  - "foreign aid changes domestic aid" was wrong;
  - "approve everything" was misread as dropping the checks (the owner corrected that within minutes).

## 9. Approved rulings today (they apply to all future work)

- **A21 tuition:** the annual amount is split into the school's terms, with the remainder on the last term. The freeze caps charges. The old budget-factor path is deleted.
- **A53 mortgages:**
  - principal = recorded price × (1 − NAR 2025 down-payment share);
  - rate = game rate + 2.525 points, over 30 years;
  - aged by tenure;
  - on the shared `openHouseholdLoan` path (merged #2041).
- **A43:** filing and adoption stand alone. An equal-pay cohort gets 0 raises, which is correct.
- **A60:** receipts = each business's recorded period sales, posted once per period into employer cash from day 1, excluding government payments already recorded.
- **A59:** a group with zero members closes. A group is founded only by a recorded person's decision. Rolls are deleted.
- **Starting-law schema (#2072):**
  - `lawCategories` on starting rows;
  - `IncomeTaxSchedule` for brackets, a generic tier list for other tiers;
  - quantity units in `LawAmountUnit`;
  - Audit is the sole implementer.
- **A157:** attendance binds to the most recent real town meeting in the quarter.
- **Federal aid:** goes through `recordAdoptedAppropriation` → `commitPublicProgram` → `settleProgramInstallment`, with claims from posted state installments.
- **A60 opening cash:** payroll × the 27-day median buffer (JPMorgan Chase Institute 2016).
- **A49:** federal opening cash = outlays × the game's state cash-to-outlay ratio.

## 10. If you are Codex taking over

1. Get **#2035** under 1.2x with the two posted fixes, gate it, and merge it. That finishes the 80% goal.
2. Merge #2076 on the fast re-check PASS.
3. Keep every session busy with one item from the audit (`npm run audit:scan`). Send back with exact fixes. Merge on PASS in order.
4. Then the FIX-FIRST list, the bug list, and the kit12 UI.
5. Report to the owner in 1–2 lines with what changed in play, not PR numbers alone.

---

## 11. Additions from re-reading the owner's own messages (Sept 29 – Oct 2)

These come from checking this handoff against every message he sent. Each item is something he said that sections 1–10 left out.

### A. The docket and check-ins
1. **The docket is the source of truth and the channel to him** (Owner's Docket artifact). Every check-in updates ALL of it. Don't restate in chat what's in the docket.
2. **Update the docket after every merge** so the percent visibly rises: teams closest to done, what merged.
3. **Never delete his open notes or rulings without answering them.** Clear only what he has decided.
4. **The docket works like an iOS app:** tabs and tiles, no long scroll, fits an iPhone 15 Plus with no sideways scroll. Anything he asks for becomes a docket tab, the roadmap included.
5. **Team dashboard:** click a team to see its current job, next job, percent, steps and what's queued.
6. **Check-in order:** coordinator doc → GitHub → what every team/session is doing → docket. Cadence: every 30 minutes (every 15 while he's awake). The timer must actually fire. Always run `date`; never estimate the time.
7. **Every check-in confirms the total session count and what each session is doing,** confirmed by the coordinator. No session sits idle.
8. **Every coordinator update gives the coordinator concrete work** (through the Google Doc), cross-checked against the audit.
9. **Every audit item has an owner.** No "unowned" items: give A6, A133, A107, A132, A80, A16 and A51 owners immediately.
10. **Redeploy at 80%:** when a slice hits 80%, move its sessions to the biggest gap at once. Message the Claude cloud checkers on every handoff, or they idle.
11. **Report progress as percent built per slice,** never a bare fraction like "2/8", and never multi-hour guesses. Any slice can be picked, not only "Your money".
12. **Don't merge or overwrite what he's still deciding.** Approving an approach is not approving the content.
13. **Playthrough notes sent during a goal are QUEUED,** not assigned to the sessions working the goal.
14. **When a placeholder is found, tell him or ask an inline question with a few options** (AskUserQuestion, recommended option first).
15. **Tell him when research data goes into code;** he shouldn't have to find it by reading thinking.
16. **CTO decisions go on the docket as overrule-able items.** He accepts most.
17. **Research timebox:** a legal-rule lookup is one Google search, 10 minutes or less, covering all states.
18. **CI runs only the changed tests** (he approved editing the CI workflows; no full suite on old code).
19. **Diagnose shared breakage (CI, the GitHub queue) the same day.** Don't route around it.
20. **"Finish over perfect" (Oct 2):** the 80% goal is "bare bones just to get the system working". Finishing beats data precision.
21. **FIX-FIRST also includes:** #1928 leaves accounts unopened when ownership is unclear (estimate from the game instead), and about 28 values use real-data drift instead of drift from the game's own entities.

### B. Usage, models and who does what
22. **Weekend resources:** Codex has resets plus cloud credits. Claude stops at 90–95% usage. Codex owns gating order and merging while Claude is capped: use the flow in section 3, with Codex sessions as checkers if the Claude checkers are unavailable.
23. **Models and effort:** sessions run on Low or Medium effort, with only ONE High-effort session at a time (he finds High overestimates). The coordinator runs light. Each session may use up to two light subagents.
24. **The Audit/Systems session (High, two Medium subagents) solely owns engine and code questions.** Teams only build.
25. **He can open more sessions (overflow, standby);** Codex may open more cloud sessions if it can.

### C. Laws, engines and effects
26. **One engine per domain holds all of that domain's calculations,** as many engines as needed. Laws are DATA on a frame (who / what / how much), never per-law code, and must be moddable. The audit names six engines, including the CLOCK (one way to move time).
27. **Each law has the correct authority or authorities** (federal, state, local) and they interact modularly. Cover all jurisdictions, never one.
28. **Every law has an effect, a cost and ideological parts.** A bill has multiple effects, all felt in play.
29. **The effects/outcome map is a design pillar.** It's updated as laws are built and lives in the docket. Each item opens its own page with what feeds it, real numbers and worked examples, and principles from -1 to 1 shown with an example (for instance "dad was Republican and was in a car accident").
30. **The player can change anything government touches,** healthcare and pension systems included. Any part of a law is repealable. Laws combine, including poison pills. A laws calculator is wanted.
31. **All 50 state legislatures run in unison.** If only the player's state passes laws, that's a bug.
32. **Research is calibration only.** Every value has a realistic anchor from the simulation unless a law fixes it. Never research one state only.
33. **The English/prose engine produces emergent scenarios dynamically,** and authors can write scenarios for it.
34. **Feature walkthrough gold standard:** for every feature, the why-chain to bedrock with drop-downs (skill-feature-walkthrough.md). He praised it.

### D. Player-facing text and UI
35. **No statute citations, source or estimate wording, "fictional world" disclaimers or dev strings in player text.** It breaks immersion. Hard-coded version strings ("V.0.4.0") must go.
36. **Remove empty or premature tabs** ("Waiting on you", "Your office" until the player holds one, issues, budget, parties) and duplicate screens for the same job.
37. **Run for office happens in the world:** the player goes to the clerk's office, talks to someone and signs up, which teaches the campaign system. Nothing is menu-only; the player must be able to meet people.
38. **Public meetings:** attendees, a sensible agenda, speaking at a microphone, and dialogue that changes outcomes. No canned lines.
39. **The journal is a story, not a list,** and names people by relationship ("your dad").
40. **Scenes are populated dynamically** from tagged seats, standing spots, posters, TVs and newspaper spots. Backgrounds aren't hard-coded and poses aren't all the same.
41. **Person dossiers show role and real detail.** People glow softly on hover. Fix tiny people, missing hairstyles and clipping.
42. **Dialogue box:** serious and political, not video-gamey. The panel sits between translucent and transparent, heavier, with a tight shadow and not too brown. Replies may be numbered, no chevrons. Liked fonts: Crimson Pro, Spectral, Source Sans 3 (kit12 uses Cinzel / Andada Pro / Fira Sans).
43. **The Lie control is a symbol (scales), never the word "Lie".** The scales tip when lying, lying answers glow soft red, and it sits in the upper right, small.
44. **Menus are low-key and sleek** and don't dominate the screen. Not Apple-native-looking; they complement the game art. Hover is a smooth white glow, red for a lie. Tabs fill the menu space. No payday notice.
45. **UI mockups are built from real game screenshots.** Not cartoony.
46. **The radial menu was bundled, oddly shaped and covered the player portrait.** Fix it.
47. **No busywork prompts.** The day-in-review doesn't pop up unasked. The clock shows the real time. The TV news fits the TV. Newspapers need no subscription.
48. **The BUG LIST (from his Oct 2 playthrough):**
    - state legislators don't appear;
    - "you haven't spoken" shows on everyone;
    - 1974 is shown as a date;
    - no local government for Atu Station AK;
    - only one Kentucky senator;
    - the government map is low resolution.
49. **Playthrough protocol:** when he sends a message during a browser playthrough, screenshot immediately; he waits for it.

### E. Art and Steam
50. **Realism:** he asked for 6.5, then "dial it back to 5.5", then "+20%", then "too realistic". The settled level is the A6 box (about 6). Not photoreal, not cartoony.
51. **Ballot:** he first wanted "Our Civic Duty" on the ballot. Later, mid-task: "where our civic duty is spelled out, it should not be on the ballot… looks too AI slop-like." So the ballot is BLANK wherever the title is spelled out.
52. **Logo:** no hand or skin, camera panned down, not cartoony, no lock.
53. **Key art:**
    - the convention must be packed;
    - include older people;
    - space the judges apart;
    - fix the Resolute desk and the flags (a state flag or none);
    - use real game scenes;
    - not too many flags.
54. **Art library scope:** generate all pose angles (backs, sides, three-quarter) for every pose. Generate 30–50 colleges in every season, by day and at night. Generate SHEETS, not single images.
55. **Tools:** Firefly for art, Canva for logo option sheets. He rejected ChatGPT image generation.

---

## 12. More from the owner's messages (Sept 26 – Sept 29), not covered above

### A. Priorities (read this first)
1. **TOP GOAL: make every law do something real.** "the priority is to make the laws do something real"; "Getting this law stuff done today is number one". After the 80% finish, law wiring across ALL policy areas comes before polish.
2. **Laws are the backbone; never narrow them** to money or transport. They must cover all policy areas and all 187 topics, each with its correct authority or authorities.
3. **Model government broadly:** immigration and humanitarian policy, social issues (marriage, birth rates), media behavior, work weeks.
4. **Effects link across areas** (education ↔ healthcare and so on), with direction and degree researched. **Crises are spirals from conditions, never fixed odds.**
5. **Real data is calibration only.** The game can exceed anything seen in real life. **The starting law is real current law and must be recognizable.**
6. **Voter counts come from the in-game voting-age population,** with a moving anchor, never hard-coded. Add House capping and uncapping. Percentages are fine only where they mirror a real law.
7. **Stress-test emergent systems with real historical cases** (an influence broker, a party boss). These are design references; real-person likeness and published real-person content stay out.
8. **He is open to rewriting or deleting parts of the game for the engine.** "It doesn't script things. It produces things."

### B. People and the living world
9. **The 97 personality traits feed every decision as real reasons:** government, judges, everyone. Traits change with experience, have strength levels and rare big moments, and are NOT formulas ("I don't like formulas"). Personality maps to the person, not to a politics label.
10. **People must be real and alive:** NPCs hold the jobs and pursue goals. "The world is so dead" was a complaint.
11. **Judiciary depth:** judges have integrity and philosophy, and the court is not locked at 9 justices.
12. **Pitch pillars:**
    - politics is the main path;
    - jobs exist so money has value;
    - the first wow is clicking the president and seeing their record;
    - dynasty play ("play as my son and he can ride the wave of my movement").
13. **A year of history is generated before the start,** with drift, and graphs (the president included).
14. **The per-person religion record is approved.** Bill numbering follows each jurisdiction's real convention (for example "HB1 2026").

### C. Economy
15. **Pay periods are staggered.** Debts are only mortgages and student loans (with interest) for now. Books balance by construction.
16. **State-specific tax rules and local taxes in all 50 states** (no sales tax on food where that's the law). Tariffs move commodity prices by region. **Taxes settle automatically**; this is decided, so don't ask again.

### D. Dialogue, journal and campaign
17. **The English/dialogue engine** has Baldur's Gate 3 as its reference: dialogue reacts to the simulation and to what the character knows. It rewards players who do extra work. There is NO in-game AI. It covers everything, with regional speech ("y'all", "yinz"), consequential word choices and a tone that changes over years. Dialogue must change the world; no canned lines.
18. **Meetings are interactive scenes:** go up to the microphone, with real attendees dressed for the setting.
19. **The journal is a written story** (a death retrospective in the CK3 or BitLife style), not a dated list.

### E. UI and UX
20. **UI direction:**
    - no navy in the game UI, no remnants of the old UI;
    - Crusader Kings and Sims spirit;
    - Steam-storefront polish.

    The navy ballot logo is his own pick for branding.
21. **The radial menu comes back** (restyled, not bundled, not covering the portrait), with **the character portrait next to the clock.**
22. **Glossary underlines MUST SHIP:** a tiny underline on terms opens the glossary, and once marked learned it no longer comes up.
23. **Mockups start from real game screenshots;** he approves the design.
24. **Delete what he flagged and what you replace.** No duplicate screens, no extra clicks or buttons, no forced "continue".
25. **TV screens and newspapers are interactive live surfaces** with daily headlines; the news video must fit the TV.
26. **Home screen:** don't default to the apartment when a save exists; saves and options are visible; heroes appear dynamically. Turn on automated release versioning (no hard-coded v0.4.0).
27. **Remove developer screens from the player build and delete dead code.**
28. **Defects from the Sept 29 playtest:**
    - fair market rent on the start screen;
    - the place search should hide after a pick;
    - the president and vice president should show at the start, and the president's dossier should say she's the president;
    - people are too small, and outfits change between screens;
    - the clock says 7 a.m. at night;
    - "The household has no shared money yet";
    - only one senator on the map, the map is low resolution, and "U.S." is lowercase;
    - portraits should sit next to districts;
    - the day-in-review pops up unprompted;
    - the people web is slow to load faces.
29. **Old saves don't matter until he says so,** but saves must eventually load and be updated.
30. **In playtests, also report what he didn't say but you noticed.**

### F. Art
31. **State capitols differ** from each other; interiors use varied real references, not all on a green lawn, and not every place is clean or nice. Tag art for local flavor.
32. **Poses:**
    - seated, with seated angles;
    - backs, sides, three-quarter views;
    - podium angles;
    - nothing posed like a model;
    - use the gray masters for new poses.
33. **Modular-people defects:** jigsaw seams on faces and shirts, specks on dark skin, too few hairstyles. Needed outfits: formal pantsuit, casual, business casual.
34. **Firefly:**
    - refresh when it stalls;
    - don't queue too many at once;
    - credits are not a concern, and the included models are free;
    - art must match the game's style.

### G. Process
35. **Check-in cadence:** teams check in every 30 minutes and the CTO a few minutes after. Work continues while he's away or asleep. Timers must actually fire; if one mechanism fails, switch mechanisms.
36. **Merge authority:**
    - merge freely, with approval needed only for big things;
    - never merge something he's still deciding;
    - keep open PRs near zero by closing stale ones constantly;
    - cancel stale CI runs.
37. **Placeholders may exist only where truly unsure, and every report must list them** (code AND data, with counts).
38. **Reply length:** 1–2 lines by default, BUT a full briefing or breakdown when he asks, and the docket always current (decision list, idea list, what changed, what merged).
39. **Inline questions are liked; never re-ask decided things.** The only question worth asking is the depth of realism. Read the Decision Register and research first.
40. **Ask the WHAT and WHY of each system before building, approve research before implementation, and write very specific briefs** for Codex.
41. **Every session is assigned a model and effort level.** Escalate only after repeated failures. Only ONE High at a time. No new teams without his OK.
42. **Usage limits:** do a hard stop and hand off at about 98% ("Don't estimate it"; check the real figure).
43. **Verify claims in code and by playing.** Codex sometimes says something was removed when it wasn't.
44. **Coordinator channel:** Codex answers only inside a document. Send it one clear prompt. Message cloud sessions directly instead of making him paste.
45. **Reports for non-technical readers:**
    - patch notes for his girlfriend, without the game's name;
    - a walkthrough artifact with screenshots;
    - treat her as the first-time-player persona.

### H. Calibration: what he praised and what angered him
- **Praised:**
  - zero one-state cases;
  - inline questions;
  - a clear overnight plan;
  - modular people;
  - the people and election maps;
  - the day-in-review idea (as long as it doesn't pop up unasked);
  - the feature-walkthrough format;
  - the patch-note style.
- **Angered:**
  - re-opening decided things;
  - clock errors and stalled timers;
  - narrowing the law backbone;
  - failing overnight or while he's away;
  - merging mid-decision;
  - being the bottleneck;
  - vague send-backs;
  - guessing instead of looking it up.
