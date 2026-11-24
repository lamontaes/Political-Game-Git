# Steam store page made from played runs: screenshots, capsule art, trailer cut, store text, requirements, Coming Soon (bank id b42, phase P3/P6 gaps G59/G60/G61/G132, unlocks the Coming Soon page about Oct 15 and the 1.0 launch)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

A person on Steam finds "Our Civic Duty" at $14.99 on a Coming Soon page. Six 1920x1080 pictures show a real game: a city councilwoman in a Mississippi town at her dais with a resident at the lectern, a clerk's counter where someone files for office, the newspaper and TV carrying the story the player caused, a state house floor in a territory, a courtroom, and the player's journal opening a new chapter. Each picture comes from a run a person (or the test harness) really played on a seed, in a place drawn at random, and the page names none of them as "demo." The trailer is the same runs cut together. Nothing in a picture is a placeholder name, a painting the owner threw out, or a real private person.

## Owner decisions it rests on

- Owner, Oct 5 9:56 p.m. (ledger-rulings): "$14.99. The only thing that's holding me back from publishing the page now is that I can't get any endgame screenshots."
- Owner, same answer: "I would've loved to put it up and have it up by the 15th so ASAP I guess I just wanna get it up the coming soon at least but sometime in October would be great. I wanna get it before the election in November."
- Owner, Oct 5 evening rulings: "Coming Soon page up as soon as real screenshots exist (target Oct 15), release before the November election."
- Owner, Oct 5: "Every item merges only with a screenshot or clip from a real game."
- Owner (opus words, 9/27 02:39, in the audit list): "use screenshots from the actual game and adjust those".
- Register, Sept 15 18:57 rejection: "permanently retire the pictured legacy audience/lectern meeting-room title backdrop from player-facing runtime." (scene `civic-community-meeting-title`, tableau `a-community-meeting`)
- Register: "A public 1.0/Steam/commercial launch or artistic acceptance remains a separate meaningful decision." So the capture tool and files are built now; submitting anything to Valve waits for the owner.
- Register, Sept 19: "Do not merely hide it with CSS" and "no forced political success or hidden state mutation to manufacture a passing route" (multi-journey evidence): shots come from real plays only.
- Early Access: the register has no quote either way here; the handoff (Oct 2) says "NOT Early Access, aiming for 1.0", and the Oct 5 roadmap ruling says Early Access once the council journey, mayor and state legislature play well. Not decided in these words; see the open question.
- The price and the date appear only in the owner's ledger answers above, not in the register. Nothing else was found by grep.

## Existing code to extend (VERIFIED on a88744a25)

- NOT on main: `docs/steam/` and `steam/` do not exist (ls fails); no store text, requirements file, questionnaire, cut list, capture tool or depot files. grep for "14.99" in the repo finds nothing.
- `docs/codex/ui-logo-packet/03_steam_capsules/` holds build_c.py (:1-4, "Option C ... One page per Steam asset at exact pixel size"), render_c.mjs and ten PNG sizes (header 920x430, small 462x174, main 1232x706, vertical 748x896, library 600x900/hero 3840x1240/logo 1280x720, page background 1438x810, icon 184x184). Navy (owner dislikes navy, 9/29) and built on a collage, not on played runs.
- Existing capture code: `tests/e2e/a148-other-parent.spec.ts:57,74` and `a39-composed.spec.ts:71` use `page.screenshot`; `tests/e2e/support/shot-path.ts:25 shotPath` writes to the run output dir unless `PG_CAPTURE_EVIDENCE=1`. `docs/codex/session3-two-directions/capture-script.txt` is a one-off spec that draws a place with `drawRandomPlace(seed, p=>p.scope==='locality')` and sets viewport 1920x1080. `playwright.config.ts:91` default viewport is 1440x900; `:89` screenshot is only-on-failure.
- `tests/support/random-place.ts:16 drawRandomPlace(seed, accept)` over all 56 jurisdictions. Creator helpers in `tests/e2e/support/creator.ts` (`startLife`, `enterLife`, `goTo` are imported by the capture script; `beginAfterCalibration` :85, `chooseCreatorLocation` :125).
- `scripts/playtest/mass-play/run.ts` (flags `--games --workers --years --out --mix --seed`, :30 runSeed) plays real games to JSON lines; no pictures.
- Retired painting guard: `tests/e2e/frontdoor44.spec.ts:5 RETIRED_SCENE = "civic-community-meeting-title"` and `src/presentation/title-tableau.test.ts:178`. Reuse that id list for the selection rule.
- Desktop: `desktop/package.json:17 dist:steam` stages with `--distribution steam` (`stage.mjs:51` checks "direct|steam"); `desktop/README.md:137-141` says Steam builds disable the updater and "No AppID exists". Electron 38.4.0 (`desktop/package.json:23`); root `package.json:7` needs Node >=22.13.0. Workflows: audit-scan, browser, desktop-package, release, validate (no Steam upload workflow).
- Known Steam facts (HANDOFF-TO-CODEX-2026-10-02.md:11): app 5376890, developer and publisher Lamontae Shively, not Early Access. Q10 in cto-notes/briefs-queued says the SDK stays at ~/Documents/steamworks-sdk, never in the repo.

## Build steps (one PR each, in this order)

1. **Capture tool.** New `scripts/steam/capture.ts` plus `tests/e2e/steam-capture.spec.ts`: takes `--seed` and `--out`, draws a place with `drawRandomPlace`, plays the real flow with the existing creator helpers (no state edits), and at named moments (council or chamber sitting, clerk counter, newspaper/TV, journal chapter, courtroom when b13 lands) writes a 1920x1080 PNG plus a sidecar JSON: seed, place, jurisdiction, game build id, scene id, person ids on screen, time. Files: those two, `shot-path.ts` reused. Must not: edit world state, hide panels with CSS, run dice, write into tracked `docs/agent/evidence`.
2. **Selection rule as code.** `scripts/steam/select-shots.ts` reads sidecars and rejects a shot if: the scene id is on the retired list (step 1 reuses frontdoor44's id plus raster `title_bg_civic_community_meeting_hero_slot_5504x3072_v1`); any visible text matches a placeholder pattern from `docs/codex/assignments/placeholders.md`; any person id is not a game-made record; any name is a real private person (real names allowed only for public bodies, hospitals, colleges, banks); the place repeats another chosen shot; the picture is blank or a loading frame. Picks six, each from a different jurisdiction, at least one territory or D.C. Replaces: nothing.
3. **Capsule art from play.** Rewrite `build_c.py`/`render_c.mjs` input so the collage panels come from selected shots, with no navy fade (owner: no navy) and the Cinzel 800 gold #d6bd84 title from kit12. Output the ten sizes to `docs/steam/capsules/`. Replaces: the old collage-based set in `docs/codex/ui-logo-packet/03_steam_capsules/` (delete the PNGs and html once the new set exists). Owner approves pixels side by side before upload; not auto-published.
4. **Trailer cut list from play.** `scripts/steam/clip.ts` records short clips of the same seeded runs (Playwright video, 1920x1080), and `docs/steam/trailer-cutlist.md` lists 60-90 seconds as seed, scene id, start, end, from the sidecars; the first wow is clicking the president and seeing her record. No authored voiceover; on-screen text only from game records.
5. **Store text and requirements from the repo.** `docs/steam/store-page.md` (short description 300 characters or less, about this game, features, tags with Multiplayer, Immersive Sim and the duplicate RPG removed) and `docs/steam/requirements.md`, where every minimum is read from what the Electron build and Node engines really need (Electron 38.4.0, `desktop/package.json`), and any number not measured says "ESTIMATED FROM AVERAGE: desktop Electron games of this size". Questionnaire answers drafted in `docs/steam/questionnaire.md`, not submitted. Facts in store text come from a test that greps each claimed feature against a shipped file.
6. **Coming Soon checklist and secrets.** `docs/steam/coming-soon.md`: price $14.99, release before Nov 3, target date about Oct 15, what is still missing. Upload stays manual or through `STEAM_SDK_DIR`, `STEAM_USER` read only from env or GitHub secrets; a test greps the repo for any password or key literal. Must not: store SDK, credentials or login in the repo; submit to Valve without the owner.

## Must NOT build

A second screenshot harness (extend Playwright specs); fake or composited screens; the title painting the owner retired; screens from the mockup menus (`docs/mockups`) rather than the live game; the depot, VDF and signed-build pipeline (Q10 in the briefs, desktop packaging owner); in-game achievements or Steam overlay features; foreign pressures (after 1.0); the death/look-back and endgame screens themselves (b19, b20); newspaper and TV surfaces (b40); council, statehouse and courtroom scenes (b05, b35, b13), which this only photographs; art generation (art team).

## Research tables

Repo first: `docs/codex/ui-logo-packet/` (kit12, logo), `cto-notes/steam/` (logo box-nolock-1.png, emblem-final.png, key art keyart-collage-v1), `desktop/README.md`, `package.json` engines, `docs/codex/assignments/placeholders.md`. Missing, one search each, 10 minutes: Steam screenshot size and count rules, capsule pixel sizes (Steamworks docs), Steam store-page lead time for Coming Soon (docs). Never invent a system requirement; mark "ESTIMATED FROM AVERAGE: ...".

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts drawRandomPlace`: `steam-capture.spec.ts` plays it and produces six selected shots with sidecars, each from a different jurisdiction.
- Same flow in a random territory place and D.C.: same code path, shots accepted by the same rule.
- Tests: `select-shots.test.ts` (retired scene, placeholder text, private-name and blank-frame fixtures are rejected), `steam-capture.spec.ts`, `steam-claims.test.ts` (each store claim finds its code), `steam-secrets.test.ts`; a grep test that the old collage capsule files under `ui-logo-packet/03_steam_capsules` are gone and that no `civic-community-meeting-title` image is in `docs/steam/`.

## Proof to post

PR comment per step: seed and drawn place, the six PNGs side by side with the sidecar rows, rejected shots and why, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) Early Access label versus 1.0 at launch; (2) exact day for the Coming Soon page. Switches kept: store price and date in one data row `docs/steam/store-facts.json` (default $14.99, target about Oct 15), Early Access flag in the same row (default false per the Oct 2 handoff), number of shots one constant `STEAM_SHOT_COUNT` in `select-shots.ts` (default 6). If the council journey (b05), b19 or b40 has not landed, capture from the scenes that exist and leave the others as stubs in the cut list.

## Correction (CTO, Oct 6 2:35 a.m.)

The owner decided Early Access on Oct 6 at 12:20 a.m.: Early Access once the council journey plus mayor and state legislature play well, offices up to President in updates. Set the store-facts switch to Early Access by default; the Oct 2 "NOT Early Access" line is superseded.
