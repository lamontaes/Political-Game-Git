---
id: laws-georgia-state-minimum-wage-missing
title: "M1-01 is red on main in Berlin, Georgia: the state's minimum wage law has no state-level row"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/georgia-state-minimum-wage
pr: #6023
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T18:37:27.225Z
---

**What.** The accepted spec M1-01 (src/core2/laws.test.ts, 'a random place: every tracked series matches its source at every level') fails on main 663a38fedf in Berlin, Georgia (place key 1307304, seed 9be80e9b9066dcf6371f6eb26b4a61bfd555a52f5e9f6df8816bba27f0242dc4) at laws.test.ts:200: expected the state minimum wage 515 (cents an hour, Georgia's $5.15 statute), received undefined. It fails the same at b3acc9946a and its parent, so it predates that change. Golden-path turned red on #5875 by this draw.

**Rules.** One rule, all 56 places: every state's own minimum wage statute is a state-level law row read the same way in every place, including states whose rate sits below the federal one.

**Done when.** GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY above make npx vitest run src/core2/laws.test.ts pass, with the cause named by line in the PR, and the test passes in three more drawn Georgia places, the other state whose general rate is below the federal one, and a state whose equal rate had the same missing-tier cause, named with seeds. **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Files.** src/core2/modules/laws.ts, data/laws/

**Notes.** Oct 26 (speed lead): the same failure drew Irwinton, Georgia (place 1341400, seed 1dc85eb3951c974b6ed80230a8efdccdee28ffcb59209fd8e1242ee71792c1fe) in #6065's golden-path run, and it reproduces on main be6137ae1b with that seed and place: `laws.test.ts:200` expects the state minimum wage 515 and reads no state-level row.

Merger 3, October 26: factual acceptance clarification from the sourced matrix and the built general-rate rows across all50states: only Georgia and Wyoming have their own general rates below the federal725cents, so two other below-floor states do not exist. Retain three-state regression coverage using Wyoming515 and Kansas725 (the same sole-tier cause), with the three additional Georgia draws. This changes no law value, coverage rule or production behavior.

Implementation merged through PR6023 at0a5d5d0a97dd70d91aebef037021742060de224a; PR6083 now adds only a duplicate already-consumed release declaration and remains unmerged. Own original port gate plus exact generator reproduction and Berlin6cases passed; main recheck also passes6cases each in Girard,Stapleton,NorthDecatur,Cowley,Bazine, with the full seeds in PR6083. Completion is recorded against actual merge6023, not unmerged6083.
