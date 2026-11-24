# Rulings sweep: Dev Mode, Dev Tester, Speed

Written Nov 8, 2026, about 2:15 a.m. Eastern (07:15 UTC), read-only. Code checked on main at `a1124e0e` (07:05 UTC). Night briefs read on branch `docs/night-2026-11-08` (PR #7366, open).

How to read this:

- A quote in "marks" is the owner's words, exact, unless the line says "recorded" or "CTO". Then it's the CTO's written record of his ruling, not his own words.
- Status: **done** (file:line or PR), **partly** (what's missing), **not done**.
- Each section lists not-done and partly first, then done.
- Sources: OD = `docs/coordination/OWNER-DECISIONS.md` (line), LAW = `docs/play-first/LAW.md`, REG = `docs/coordination/DECISION-REGISTER.md`, mem = the CTO's memory notes on the Mac.

## Conflicts (newer wins unless noted)

1. **Instant law vs. real path.** Oct 14 (recorded, OD:701): dev mode can "pass or repeal any law at any level instantly". Nov 8: "Making it happen should just trigger the code in the game that makes it happen." Nov 8 wins. `setLaw` (`src/bench/dev-mode.ts:376-431`) calls `enactLaw` directly, with no bill, sponsor, vote or signature. It must become a real bill and vote.
2. **Dev screens out of the player build vs. dev controls on the game's screens.** Oct 9-10 (LAW:98): "Developer screens (LQ-10). Removed from the player build and kept in the developer route." Nov 8: dev controls sit on the game's own screens. Nov 8 wins. Both hold if dev mode is off by default and nothing dev shows when it's off.
3. **Speed regression limit.** Sept 26 (REG:262, recorded): a Day must be at least as fast as main. Oct 29 and 30 (OD:204, OD:183): no change makes a year more than 20% slower. Nov 8 night README (CTO): "no change may make a game year more than 5 percent slower." The README is newest, so 5% holds tonight. But `scripts/speed-years/README.md:3` and `run.ts:18` still say 20%. The CTO should say which one stands and fix the other.
4. **The bar vs. the tool.** The bar is 120 seconds a year (OD:183). `npm run speed:year` fails only past 300 seconds by default (`scripts/speed-years/run.ts:49`). Run with `--max-seconds 120`, or change the default.
5. **Long runs.** Sept 26 (REG:262): the 100-year batch "is set aside for now". Oct 29 (OD:199): "I want simulations to be able to go hundreds of years." Oct 29 wins.
6. **History before the start.** Oct 9 (mem): 2021 to 2026 before Begin. Oct 12 (mem): back to 2000. Oct 28 (OD:384): from the player's birth year. Oct 28 wins, and it's done (Speed section, S-done 1).
7. **Random places vs. fixed towns.** Sept 28 and Oct 12: random places every time, never re-run the same towns. Nov 3 (OD:22-28, recorded): "Fixed towns are for lane finish lines only." Both stand. A fixed town is a measured baseline only (Montpelier, Upper Witter Gulch); every proof also runs on random places.
8. **Fast-forward vs. keep-only-results.** Nov 8: a coarse 20-year run is fine "as long as it makes sense in the end". Nov 5: keep only results, build detail on demand. These fit together if the coarse run decides from people and aggregates with no dice, and detail built later agrees with it.
9. **Merge checks.** Oct 28 (OD:400): branch protection requires validate and golden-path. Nov 3 rule 2 (recorded): one check, a new game opens and runs briefly. Nov 3 wins.
10. **Outside officials on demand.** Pool item `gov-outside-officials-built-on-demand` says done (#7359). The PR body says it stays open for naming them only when asked (`seatAll` is still 5.9% of year 1). Speed should treat the naming part as open.

Not a conflict:

- Oct 14 (recorded, OD:697): "no skip-ahead control" for the player. Nov 8's "run X days or until" is a dev control. Oct 14 night (OD:797) also lets a player skip quiet days.
- The twin checker requires twins with no change to match exactly (`src/core2/outcome-web-twins.test.ts:7-9`). That's zero dice. The owner's drift comes from the law's own knock-on chains.

---

## 1. Dev Mode (CTO's account, `devmode/`)

As of 07:05 UTC no `devmode/` branch or PR exists on GitHub. Every dev control lives only on the separate `/dev` page (`src/bench/dev.html`, tabs at lines 255-260: Laws, Decisions, Trace, Watch, Golden path, Experiments).

### Not done or partly

**D1. Dev mode is the proving ground.** "It should be a fast track to prove whatever needs to be proved in the game in order to call it working, or prove like knock-on effects and stuff. Being able to simulate X amount of days at a time, or until a certain thing has happened, or a certain bill has passed, etc. Or you could force pass things and you could choose the margin, etc..." (Nov 8, 12:50 a.m.; mem dev-mode-proving-ground-nov8; night `rulings-nov8.md` #4)

- Run X days: **partly.** `advance(to)` runs the world to a date (`dev-mode.ts:641-677`). The steps are day, week, month, year or date (`dev-api.ts:67-77`). It's on `/dev` only.
- Run until an event (a bill passes, an election, a death, a scene, a law takes effect): **not done.**
- Force pass at a chosen margin: **not done.** There's no `draftBill` in dev mode. Votes work only on bills that already exist, and only the 30 newest (`dev-mode.ts:146`, `BODIES_SHOWN = 30`).
- Do: build run-until first (brief item 5). Then add introduce plus pass-at-margin through `draftBill`, `castMemberVote` and `holdVote` (brief item 2).

**D2. A dev button triggers the game's own code.** "dev mode can have a button or whatever that says, make this happen. But that doesn't mean that it should be an isolated thing that makes the thing happen. Making it happen should just trigger the code in the game that makes it happen. So again, it has to be built out to where the player can get to it. That is proof of concept in both directions." (Nov 8, minutes after D1; voice note `2026-11-08-story-and-night.md:13` on the night branch)

- **Partly.** These already call the game's own code: `vote` (`dev-mode.ts:615`, `castMemberVote`), `holdVote` (621), `sign` (630, `executiveDecision`) and `choose` (a person's next act, only from `availableActs`). These don't: `setLaw` (376-431) writes the law in force directly. Experiments apply through `setLaw` (`applySteps`, 820-842).
- No dev action has a player route yet.
- Do: replace `setLaw` and experiment steps with a real bill at the body that has the power. Every control you add needs the player's way to the same screen.

**D3. Every body, a bribe, a scene, memory.** "See if you can do every body of government... see if you can force a bribe... you should be able to force a scene, for example. See what people remember." (Nov 8; mem)

- Every body: **partly.** You can vote, hold and sign where a bill already exists. There's no introduce or override. Courts, school boards and appointments have no code to attach to.
- Force a bribe: **not done.**
- Force a scene: **not done.**
- What people remember: **not done.** The person view (`dev-mode.ts:692`) shows records, money, job, views, drives and relationships. It doesn't show memories or when they fade.
- Do: brief items 3, 4, 6 and 8. File the gap list as pool items. Never fake a body with a dev-only write.

**D4. On the game's own screens, with visible state.** Nov 8 brief item 1 carries the Nov 8 ruling. Oct 14 evening (LAW:12): "No seed field, no place search and no customization on the title itself."

- **Not done.** The only in-game entry is a faint ring on every screen, labeled "Customize the world" (`play.html:661-673`). It toggles a hidden class with no visible state (`play.mjs:4873-4877`). The owner saw that icon on the title in the Oct 26 sitting (`playtest/2026-10-26-1-drafts/covered-notes.md:8`).
- Options has a "Dev mode" button, hidden unless the ring is on (`play.css:1231`). It opens `/dev` in a new window (`play.mjs:3376-3381`).
- Do: make a dev setting in Options, off by default, with its state shown. Remove the ring. Mount controls beside the bill, the person card, Government and the calendar.

**D5. Same look as the approved screens, no subtexts.** "I'm going to conditionally approve all the UI stuff you made earlier, the game screens, and I want you to just go ahead and do that for everything else that's needed... take the principles you learned from everything today, apply that to, you know, dev mode screens and all that." (Nov 8, 1:35 a.m.; `rulings-nov8.md` #7) And: "I see, again, I say remove all those subtexts. I'm seeing make her decide. Only what the game offers her today. Remove all of those submenus. Kept. That's why she holds the tax at 35 mils... Fades about October too. Those, I already said I don't like those." (Nov 8, about 2:15 a.m.; mem no-subtexts-nov8)

- **Not done.** `/dev` uses Kit 12 styles (`dev-api.ts:32-35`) on its own page.
- Do: build to `docs/mocks/2026-11-08-front/` and `MENU-LOOK.md`. No line under a heading, control, memory or item.

**D6. Dev mode merges first.** "I would prefer everything to just build until dev mode is done, because that will significantly save time for everything. So anything that's, you know, waiting on something to happen should just wait for dev mode, and dev mode should be merged as soon as it's ready." (Nov 8; voice note line 17)

- **Not done.** Nothing is pushed yet.
- Do: push small PRs now, starting with the setting, run-until and memory. The merge desk takes them first.

**D7. One mode that does anything.** Recorded (Oct 14, OD:701): dev mode, "the old 'watch the world', to be renamed", can pass or repeal any law at any level, make any person or body decide, jump time, trace any record, and watch the world run. "What if" experiments live there and are a player feature in early access.

- **Partly.** All of it is on `/dev`. There's one saved experiment, a $70,000 public pay floor for 12 months (`src/bench/data/dev-experiments.json`).
- Not renamed. The ring is still called "Customize the world."
- Not reachable as a player feature.
- Do: experiments become a change set of real bills, run with run-until, reachable from the game.

**D8. Watch the world and the custom world become one mode; play as anyone.** "Watch the World and custom world become one pseudo dev mode, where you can do essentially anything, from the start." "the opening thing needs to be more like RimWorld or Crusader Kings... get rid of the opening questions... The questionnaire, that's useless." Playing as anyone, starting as a legislator or the President (recorded). (Oct 26 sitting; `playtest/2026-10-26-1.md:24`; OD:520) Also Oct 29: "a dev mode where you can be anybody, make anything happen in the simulation... trace why things happen" (pool `dev-mode-records-proof`).

- **Partly.** Done: New game shows Start a life, Advanced and Back (`play.html:141-165`). Advanced has the world settings (167-266), then "Choose who to play" (268-284, `offerPlayAs` at `play.mjs:5276`). The questionnaire is gone from the creator.
- Missing: Play as lists only people serving in an office, one office each (`src/bench/officeholders.ts`). There's no way to play an ordinary resident. There's no watch-only start with no character. Oct 24 (OD:568) put "custom, watch" under Advanced, and watch isn't there.
- Do: let Play as list any person, offices first. Add a Watch start that runs the world with nobody controlled.

**D9. No game over: carry on, keep watching, or start again.** Recorded (Oct 14, OD:715): after the player dies or steps away, continue as anyone, keep watching the world, or start a new game.

- **Partly.** The death screen lists kin to carry on as (`play.mjs` about 2885-2900, `playAs`). There's no "keep watching."
- Do: point keep-watching at the same Watch start as D8.

**D10. Capability tests belong in dev mode.** Recorded (Oct 14, OD:704): can the background world organize a protest, produce a demagogue, rarely overthrow a government, produce a realignment like 1933 to 1945, or drift toward war. Recorded (OD:671): famous careers are capability tests, "never by script."

- **Not done.** No dev control or report exists for these.
- Do: give the Tester run-until on events like these (a movement founded, a party switch), plus the Watch view, so Phase 3 can use them.

**D11. A red banner when a stopgap runs.** Recorded (Oct 9, 1:05 a.m., mem new-core-decision): "developer mode shows a red banner when one runs."

- **Not done.** No banner in `dev.mjs` or `play.mjs`. Nov 3 (OD:29) relaxed release blocking to stopgaps a player can see.
- Do: low priority. With dev mode on, show the stopgap ids that ran.

**D12. Mark gap is a dev control only.** LAW:99 (acting CTO reading): it never appears on the installed game's screens.

- **Partly.** It shows only after the ring is clicked (`play.mjs:4875`).
- Do: move it under the new dev setting.

### Done (keep them; move them into the game)

- **Trace is the ultimate trace.** Recorded (Oct 14, OD:670): from any record, click every decision behind it, with a report button. **Done on `/dev`:** `src/bench/dev-trace.ts` (tree), `dev-why.ts` (why panels), `POST trace/report` (`dev-api.ts:231`). Not in the game yet: mock `fr-dev-trace`.
- **Anything the tracer can't answer is a dev-mode item.** Recorded (Oct 14 morning, OD:745): vote reasons per member, a closed business's books, a budget cut's law and history, a person's job, pay, hours and spending. **Done:** `dev-why.ts:1-17`, with a `gap` line where an engine keeps no reason.
- **Records proof** (Oct 29, pool `dev-mode-records-proof`, #6852): **done.** `src/bench/dev-proof.ts`; `speed:year --same-records` uses it.
- **Custom start lives in dev mode** (Oct 14, LAW:13; Oct 24, LAW:134): **done** as the Advanced panel. "dictator mode = the custom game / dev mode" (Oct 12, recorded, mem) is the same thing.
- **Keep traces only for the player's circle, or when dev mode is on** (Oct 8, recorded, mem sim-speed-focus-tiers). **Done per person:** Follow puts someone in focus (`dev-mode.ts:495-548`), and #7367 keeps folded causes only for the circle and the people in focus.
- **Public pay floor is a law, not a dev raise.** Recorded (Oct 16, OD:995): "The one-time dev-mode raise is not the mechanism." **Done:** the experiment sets the `public-pay-floor` law series. Under D2 it must pass as a bill.
- **Every dev write is marked.** **Done:** `dev-mode-change` records (`dev-mode.ts:57-59`).

---

## 2. Dev Tester (second account, `tester/`)

As of 07:05 UTC: branch `tester/law-harness` has 2 commits, no PR, and is 19 commits behind main. It has `scripts/dev-tests/law-pass.ts` (draft, every member votes yes, hold, sign) and raw run output. It draws its place with `drawPlace`.

### Not done or partly

**T1. Fix what you find, don't just report.** "Now, when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken." (Nov 8, 1:30 a.m.; mem other-account-plan-nov8)

- **Not done.** No fix PR yet.
- Do: open the harness PR now. Then one small fix PR per break, failing test first. Breaks in another session's files go to the coordinator, and you re-run the same test once they're fixed.

**T2. Play dev mode and test everything, starting with the laws.** "I want it to play dev mode, and I want it to essentially test everything it can, starting with all the laws... It shouldn't just be locked to the things I say... once dev mode is made, it would be great if it could run simulations, you know, assuming that all laws are passing for different reasons in different places, and the world is starting to vary. I would love simulations of the worlds and telling me how things are drifting and changing." (Nov 8; tester brief)

- **Partly.** The harness is headless. The memory note says why the owner cares: "done" claims came from headless checkers he can't see.
- Do: keep the harness as the fast pass. Redo each law's proof through the in-game dev controls as they merge, with place, seed and a screenshot.

**T3. Every law reversible, at every level.** "And these should all be able to be reversed as well." (Nov 7, about 2:30 p.m.; mem laws-reversible-nov7)

- **Partly.** Astra's PRs #7321-#7353 added federal and state reversal paths. A body voting a repeal in a played game hasn't been shown.
- Do: in Phase 1, repeal each law through the body that has the power, Congress included, and check the effects unwind.

**T4. Twin worlds still drift.** "they should still drift because there are other circumstances. You know, someone may die earlier." (Nov 8; `rulings-nov8.md` #11)

- **Partly.** The twin checker exists (`src/core2/outcome-web-twins.test.ts`). It needs twins with no change to match exactly, which is correct.
- Do: run several pairs per big law in different places. Report what shows up in most pairs, not one pair.

**T5. Report what merged, what emerged, and VITAL STATISTICS.** "on each update please tell me if anything has emerged... just tell me what the change did." "how did this impact the wider world? This is the simulation part I'm excited for." "i meant merged but keep this too." (Sept 28, 10:39 to 11 p.m.; mem random-places-and-emergence-reports; REG:1228)

- **Not done as a block.** No code prints VITAL STATISTICS. `world-metrics.ts:1-6` keeps jobs, unemployment, pay, prices, businesses, rent and lending by place. `world-drift.ts:1-7` checks only national economy bands. Uninsured, graduation, crime, turnout, births and deaths, and party in power live in other engines.
- Do: write one script in `scripts/dev-tests/` that prints the same block at the start and end of every world: income, jobs, poverty, rent share, uninsured, high school and college, crime, turnout, births and deaths, businesses, party in power.

**T6. Capability tests and famous careers.** Recorded (Oct 14, OD:704 and OD:671). Also Sept 29 (recorded, mem zero-dice): report "here's what came out, exactly as traced, I authored nothing, no inferences."

- **Not done.**
- Do: Phase 3. Report what happened with the trace chain. A missing cause goes to Laws and effects or Story. Never script one.

**T7. The every-place runner.** Recorded (Oct 14 morning, OD:750): dev runs all 56 places for years and reports every crash and broken rule with place, seed and stack.

- **Partly.** It's built: `scripts/core2-year/all-places.mjs` and `.github/workflows/all-places-nightly.yml`. It has failed every night since Nov 4. Nov 7's run:
  - One crash: New Jersey place 3462910, seed `852b678d474c`, out of memory while building (3 GB worker).
  - The Seats check failed in 11 of 56 places. Seats means every seat empty past its grace is being filled.
  - 27 of 56 places had a year over 120 seconds. Workers ran in parallel on GitHub's machine, so this isn't the one-process bar.
- Do: take the Seats failures yourself unless an owner session claims them. Send the New Jersey memory crash to Speed.

**T8. The world lives without the player.** "Everything that I say I want my character to be able to do should be simulatable in the background. Remember, the world keeps living without my character. I am not the main character." "nor should any body only vote yearly" (Oct 26; `playtest/2026-10-26-1.md:25`). And Nov 1 (OD:137): "EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF."

- **Partly.** Item `core-every-life-simulated` is still open.
- Do: in drift worlds, check bodies vote on their calendars all year, and that a relative who lives elsewhere has dated life events. File what's missing.

**T9. The $70,000 what-if.** Recorded (Oct 14, OD:718): see whether private employers follow, through causes.

- **Not proven.** The experiment exists (D7).
- Do: run it through dev mode for 12 months in two random places. Report whether private pay moved and why.

### Rules for every proof (standing; follow them)

- **Random places.** "I'm tired of seeing the same four places... be random with it. It's important to test this in different kinds of localities." (Sept 28.) Oct 12 (recorded, mem): never re-run the same towns, only fresh random seeds. Name the place and seed every time. Your harness does this.
- **Nationwide, not one town.** "Where the hell is Floral? This stuff is supposed to be working nationwide." (Sept 30, mem one-rule-all-states.) Grade laws by national tables across several worlds in different states.
- **A law counts only if all its effects fire.** Recorded (mem laws-must-do-something-real): rules, services, eligibility, prices, place outcomes and people reacting, on real records in a watched world. Never money alone.
- **Ask why.** Recorded (Oct 14, OD:668): every proof answers why, by record. "Why, every time" (LAW:117): a lopsided or repeated result is a defect until a record explains it.
- **Never say it works without a played run.** "everything you're saying that isn't working, you've told me has been working." (Oct 12, 8 p.m., mem.) Report "shows in play: yes, no, or not yet checked."
- **Done means replayed.** Recorded (Nov 3 rule 1, OD:22): nothing is done until a second session replays its finish line on main. You are that second session for Dev Mode and Speed.
- **The owner closes play items.** "remove that block" (Oct 25, OD:543). His installed-build check closes the item, never the merge.
- **Dev mode never gets past a defect.** LAW:100 (the lane's rule under the owner's Oct 14 line): the lane never uses dev mode to get past a defect. When proving the player's path, use the player's route. Use dev controls only to speed things up.
- **Golden path progress.** Recorded (Oct 5, reaffirmed Oct 10, mem golden-path-rule): measure by the furthest step a normal player reaches in a random place. **Done as a reading** on `/dev` (`dev.mjs:441-475`, from `src/bench/progress.ts`). Report the furthest step in each report.
- **No dice.** "Not roll fewer dice, roll no dice." (Sept 29, mem.) Flag any roll you find.
- **Playable first.** "I really just want to make the game playable, so I'm not worried about the super detailed stuff, just make the systems work for now." (Nov 7.) Fix what stops play before what's polish.

---

## 3. Speed (second account, `speed/`)

As of 07:05 UTC: branch `speed/profile-2026-11-08` has one commit (`scripts/speed-years/profile-year.ts`), no PR. Many older `speed/` branches exist; check what's merged before reusing one.

### Not done or partly

**S1. A game year under two minutes; simulate near the focus.** "It should only do stuff in their vicinity… simulate stuff when you click it instead of rendering every action every single day." (Oct 7, about 9:40 a.m.; mem sim-speed-focus-tiers)

- **Partly.** Focus tiers are built: daily only for people seen in the last 30 days (#6102). Not met in every place. Upper Witter Gulch's election year runs 114.5 to 121.2 seconds. Montpelier year 4 runs 1,012 seconds (#7359 body). The Nov 7 nightly had 27 of 56 places over 120 on parallel workers (T7).
- Do: profile by engine and table on random places of every size, election years included. Cut the biggest cost first.

**S2. A country's year, for hundreds of years.** "And no, not just a town's year. It has to be a country's year. Like, the entire country. Like, I want simulations to be able to go hundreds of years. You know, if someone wanted to keep up their save for 2 years, I would love them to be able to play the same save and have it still be, you know, speedy." (Oct 29, about 6:35 p.m.; OD:199)

- **Partly.** `speed:year` runs the whole played world (`scripts/speed-years/README.md:3`). The CTO bar (Oct 30, OD:183) says years 97-100 must average at most 1.2 times years 1-4 in time, memory and records. Item `core-long-run-tables-grow-with-history` is open.
- Also missing: the nightly long run on a small town and the weekly run on a large one, printing years 1, 10, 50 and 100. Only the 2-year all-places workflow exists.
- Do: add the long-run job. Fold each table that grows with history.

**S3. Twenty years in seconds.** "And FYI, for the speed session, for a 20-year thing, I'm fine with it simulating everything as long as it makes sense in the end. Like, I would love if 20 years only took, 5 seconds, It took as long as it took for you to do 20 years. Click 20 years." (Nov 8, about 1:58 a.m.; voice note line 21)

- **Not done.** Two pieces exist:
  - `src/core2/pre-start.ts:1-8` already steps engines through coarse months or quarters ("never daily people") for the history before the start.
  - `src/core2/coarse-place.ts:1-14` reads another place's people as counts.
- Do: check whether the pre-start passes can run forward from today as the fast-forward. That keeps one engine per mechanic, not a second simulator. Prove it against full runs on the same worlds: vital statistics, party in power, which laws passed where. Detail built on demand must agree with it.

**S4. Keep the result, not the reasoning.** "there's no reason to index or keep everything" (Oct 8, 4:51 p.m.; mem). Nov 5 (OD:12): "it's slowing down because it is generating every record of every state and city passing laws but it is keeping those records instead of fitting them to the simulation. you dont need to do a whole huge record keeping thing. just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand"

- **Partly.** Done: the Nov 5 finish-line test (`src/core2/state-sessions.test.ts:18-93`): at least 40 states change a law, and a roll call built on demand twice comes out the same and adds up. Also done: other states' officials stay counted (#7359), and strangers' campaign records fold to a summary (#7367).
- Still growing: Montpelier's election year adds 1.45 million records. Campaign folded causes go from 94,150 to 595,258 and relationships from 43,366 to 241,231 (speed brief; #7360, #7361).
- Do: fold those three tables first. Never generate detail and throw it away; recorded at OD:15, that costs the same time.

**S5. Running memory stays small.** Recorded (Oct 12, 7:30 p.m., mem): a condensed index. Juliaetta hit 7 GB and crashed.

- **Partly.** Montpelier ends four years at 7.7 GB against the 8 GB heap cap, and memory there depends on the path the run takes (item `core-speed-montpelier-snap-scope-memory`). The New Jersey nightly crash is out of memory at build (T7).
- No owner ruling sets 8 GB. It's the heap cap every command runs with (`package.json:60`). The minimum-spec target is in open item `core-m7-01-speed-and-memory`.
- Do: twenty years under 8 GB in Montpelier on two seeds and two towns its size (brief item 2). Fix the New Jersey build crash.

**S6. Heavy opening work behind the loading screen.** "there is not enough going on in the loading screen before the world... like RimWorld, how it sits there and loads everything... I keep saying this... You own the code, but I own the [design]." (Oct 8; mem worldgen-loading-screen)

- **Partly.** The world builds in named stages: people, past, economy, core, government, opening (`src/bench/world.ts:239-241`). The loading screen plays the built world's past (`play.html:533-547`, `play.mjs:5325-5350`).
- Not checked on main: whether day 1 now costs about the same as day 2. On Oct 8 it was 58 seconds against 9.
- Do: print day 1 and day 2 in the `speed:year` receipt. Move any day-1 spike into a build stage.

**S7. Every life simulated, at low intensity.** "EVERY. LIFE. IS. SIMULATED..." (Nov 1, OD:137). Recorded: low intensity holds the speed bar.

- **Not done.** `core-every-life-simulated` is open, and nobody owns it tonight.
- Do: when it lands, measure its cost. It must fit the bar.

**S8. With everyone watched, the director is about 100 times slower.** Open item `core-speed-director-watch-all-slow` (#5808).

- **Not done.** Dev mode's Watch and Follow and the Tester's drift worlds will hit it.
- Do: take it after S4.

**S9. The regression limit and the bar.** See Conflicts 3 and 4.

- Do: measure before and after on the same place, and state the percentage. Run `speed:year` with `--max-seconds 120`.

### Done or standing (keep them)

1. **History from the birth year.** "Yes, simulate to the birth year. Remember, it doesn't have to be any kind of depth. It's just got to be general to make the game flow." (Oct 28, OD:384.) **Done:** `defaultPreStart` (`src/core2/saves.ts:152-165`) runs in the build (`world.ts:537-539`). Branch `speed/cut-prestart-history` exists; any cut keeps the birth-year start.
2. **Never call speed fixed without the number.** Recorded (Oct 7, mem): give the `speed:year` number, from a random place with its seed.
3. **Records proof.** A speed change must not change what the world decides. **Done:** `speed:year --same-records` uses the dev-mode proof (`scripts/speed-years/README.md:5`). Exception: a fold that keeps only the result, as ruled.
4. **Knowledge is compacted, never forgotten** (CTO, Oct 30, OD:108). Folds are built, not asked; agree each reader's window first (CTO, Oct 30, OD:160).
5. **Counted people in packed columns** (CTO, Oct 14, OD:649): done (two-level population).
6. **Research first.** "speed has already been solved by millions of games. It can do research. It doesn't need to reinvent the wheel." (Nov 8; `rulings-nov8.md` #10.) Also the Oct 29 speed lead ruling (OD:200): "games have figured this out, and I've made lots of rulings about speed before." The Oct 30 research summary at OD:184 is a start (Football Manager, Crusader Kings 3, RimWorld, Dwarf Fortress).
7. **Saves don't matter.** "until I say so literally none of these saves matter — delete them, corrupt them, whatever. You can't play the game. I don't know why you keep saying that." (Sept 27, mem.) Oct 29 (OD:199, recorded): that still holds for the save format until early-access preparation. Staying fast over centuries is now an engine property. Folds may break old saves. Save and Continue within one new game must keep working.
8. **Other places on their own calendar.** Recorded (Sept 26, REG:281-283): other towns and counties resolve on meeting dates, and members are thin until looked at. Nothing is computed between meetings. This matches Nov 5.
9. **MEMORY-FLAT stays behind playability** (CTO, Oct 26, OD:535, after the owner said "I don't understand what memory flat is").

---

## One line each for the coordinator

- Dev Mode: nothing is pushed yet. Start with the Options setting, run-until and memory. Then make `setLaw` a real bill (Conflict 1).
- Dev Tester: open the harness PR, start fixing, build the VITAL STATISTICS script, and take the nightly Seats failures.
- Speed: fold the three growing tables, fix the New Jersey build crash, add the long-run job, and try the pre-start passes as the fast-forward.
- CTO: decide 5% or 20% (Conflict 3) and the `speed:year` default (Conflict 4).
