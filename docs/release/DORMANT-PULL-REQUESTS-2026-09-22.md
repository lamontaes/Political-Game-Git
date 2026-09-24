# Dormant pull requests, read and closed — September 22, 2026

lamontae, September 22, 2026: "Yes, close them. Port or Frankenstein anything
from them that's usable, but then close them. I don't want stuff sitting there."

Thirty-seven pull requests had gone untouched between 9 and September 19. This
page is what each one was measured to still carry, written before any of them
was closed, so that closing them loses nothing. **Every branch named here still
exists.** Nothing below was deleted and any of it can be recovered by name.

## How each one was read

Against `origin/main` at `4965f63c`. For each pull request the merge base with
main was taken and every file the branch ADDS was listed. A branch whose added
code files all exist on main at the same path had its substance land by another
route, and is recorded as superseded. A branch that adds a file main does not
have still carries something, and that file is named below.

Two limits, stated rather than glossed. The test reads the files a branch adds,
not every line it changes, so a branch could still hold an edit to a file that
exists on both sides. And a missing `docs/release/changes/*.md` is not evidence
of anything, because a release consumes those files and deletes them; they are
excluded throughout, as are evidence captures and plan pages.

## Superseded — 23 pull requests

Every code file each of these adds is already on main.

| PR   | Last touched | Branch                                        | Title                                                                                      |
| ---- | ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| #130 | 2026-09-09   | `codex/s5-d2-raster-decode`                   | S5-D2: commit initial raster paint only after decode                                       |
| #156 | 2026-09-09   | `claude/desktop-client1-electron`             | DESKTOP-CLIENT1: installed Mac/Windows client — thin Electron shell over the compiled game |
| #173 | 2026-09-12   | `cursor/creator-location-7eb0`                | Require an explicit state, then a hometown, for a new life                                 |
| #176 | 2026-09-12   | `cursor/creator-place-summary-7eb0`           | Show a useful hometown summary after a chosen place                                        |
| #181 | 2026-09-11   | `claude/pt3-scene-conversation`               | PT3: one bounded conversation box in the room (stacked on #180)                            |
| #182 | 2026-09-11   | `cursor/creator-place-demography-7eb0`        | Add a source adapter for available place demography                                        |
| #188 | 2026-09-12   | `claude/ui-composition-continuation-i99p41`   | PT3/UI: a safe Mac play launcher, and the verified UI-bearing head to point it at          |
| #192 | 2026-09-12   | `cursor/creator-hometown-facts-7eb0`          | Show sourced hometown population in New Game                                               |
| #198 | 2026-09-12   | `claude/pt3-prose-school-scene`               | PT3-PROSE: the corridor scene names what got broken and who broke it                       |
| #202 | 2026-09-12   | `cursor/weekend19-c-scene-presence-0de6`      | WEEKEND19 C: school scenes stay at school, home presence stays household                   |
| #205 | 2026-09-12   | `cursor/ordinary-work-routine-646a`           | WEEKEND19 E: drop mandatory work reports and resolve ordinary shifts on the clock          |
| #229 | 2026-09-14   | `cursor/delivery28-x-executive-repair-e989`   | DELIVERY28 X: structured executive choices, then incident inbox                            |
| #231 | 2026-09-14   | `cursor/p29-c-talk-focus-layout-a942`         | P29-C: Talk/menu/Escape focus and bottom-center conversation                               |
| #236 | 2026-09-14   | `codex/a-playable29-c-receiver`               | PLAYABLE29 A: current C focus and bottom-center dialogue adapter                           |
| #237 | 2026-09-14   | `cursor/staff-office-onboarding-28c4`         | Staff-guided office onboarding for seated members                                          |
| #245 | 2026-09-14   | `cursor/playtest34-c-quiet-sketch-1498`       | PLAYTEST34 C: quiet rest, sketch talk, calendar time, viewport clip                        |
| #247 | 2026-09-14   | `codex/playtest34-life`                       | Preserve saved life favors and NPC activity proposals                                      |
| #248 | 2026-09-14   | `cursor/rest37-x-executive-entry-0cde`        | REST37-X: dated elected executive term and public aftermath                                |
| #249 | 2026-09-14   | `codex/rest37-n`                              | Complete REST37-N recovery and supported term office continuity                            |
| #250 | 2026-09-14   | `cursor/rest37-m-municipal-route-1925`        | REST37-M: Charlottesville attendance and manager appointment                               |
| #252 | 2026-09-14   | `cursor/rest37-m-collective-appointment-e32d` | REST37-M: require a quorate council election for the City Manager                          |
| #262 | 2026-09-16   | `cursor/alive43-art-desk-708a`                | ALIVE43 Role A — private Art Desk, tags, briefs, exact-byte reviews                        |
| #272 | 2026-09-18   | `claude/main-baseline-sharded`                | EVIDENCE ONLY: main fed321f7 under the sharded gates (baseline for #268)                   |

#181 is a special case inside that group: its head is an **ancestor of main**,
so it was merged and its pull request was simply never closed.

## Still carries something — 14 pull requests

These add files main does not have. The branch and commit are given so the work
can be taken later; they are closed because he asked for them to be, not
because the work was judged worthless.

### #133 — UI-PROTOTYPE-01: clickable whole-game shell and menu visual prototype

`claude/ui-prototype-01-build-iepvtr` at `ae9ed995`, last touched 2026-09-09.

16 file(s) not on main:

- `src/ui-prototype/App.tsx`
- `src/ui-prototype/SceneShell.tsx`
- `src/ui-prototype/TitleScreen.tsx`
- `src/ui-prototype/art.ts`
- `src/ui-prototype/chrome.tsx`
- `src/ui-prototype/data.ts`
- `src/ui-prototype/main.tsx`
- `src/ui-prototype/parts.tsx`
- `src/ui-prototype/prototype.css`
- `src/ui-prototype/state.ts`
- `src/ui-prototype/version.ts`
- `src/ui-prototype/workspaces.tsx`
- `tests/e2e/ui-prototype-r1.spec.ts`
- `tests/e2e/ui-prototype-review-screens.spec.ts`
- `tests/e2e/ui-prototype.spec.ts`
- `ui-prototype.html`

### #150 — OPENING-LIFE1: recover canonical life opening and continuing-life checkpoint

`codex/opening-life1` at `8845d61a`, last touched 2026-09-11.

3 file(s) not on main:

- `scripts/proof-opening-life.mjs`
- `src/player/opening-life/OpeningLifePanel.tsx`
- `tests/e2e/opening-life-proposed.spec.ts`

### #165 — LIFE-CONTENT13: 62-kernel reconciliation and usable life-content remainder

`cursor/life-content13-d3f1` at `f6ed53fd`, last touched 2026-09-11.

1 file(s) not on main:

- `src/simulation/life-content-reconciliation.ts`

### #183 — MODULAR-GEN14: version-safe coherent appearances, and the wardrobe gap measured honestly

`claude/modular-gen14-wardrobe-requirements` at `197cbf07`, last touched 2026-09-12.

13 file(s) not on main:

- `art/manifest/character_candidate_visual4_tone.json`
- `art/qa/people-visual4/wardrobe-requirements.json`
- `scripts/art-asset-factory/cli-people-visual4-arm-mask.ts`
- `scripts/art-asset-factory/cli-people-visual4-tone.ts`
- `scripts/art-asset-factory/cli-people-visual4-wardrobe.ts`
- `scripts/art-asset-factory/people-visual4-arm-mask.test.ts`
- `scripts/art-asset-factory/people-visual4-arm-mask.ts`
- `scripts/art-asset-factory/people-visual4-instrument.test.ts`
- `scripts/art-asset-factory/people-visual4-source-lineage.test.ts`
- `scripts/art-asset-factory/people-visual4-source-lineage.ts`
- `scripts/art-asset-factory/people-visual4-tone.ts`
- `scripts/art-asset-factory/people-visual4-wardrobe.ts`
- `scripts/dev-lab/appearance-recipe-v2-proof.test.ts`

### #191 — PEOPLE-WEB17: relationship web and unified person card

`cursor/people-web17-cbae` at `1fc87dd4`, last touched 2026-09-12.

1 file(s) not on main:

- `src/player/people-web-adapter.ts`

### #200 — WEEKEND19 A: UI browser repairs for leftover plates and current shell

`cursor/weekend19-ui-land-8edd` at `fc6506e3`, last touched 2026-09-12.

1 file(s) not on main:

- `src/player/useRasterTier.test.ts`

### #204 — WEEKEND19-F: Period-based education progression (years, tuition, compact UI)

`cursor/education-weekend19-f-11ed` at `943e5e56`, last touched 2026-09-12.

1 file(s) not on main:

- `src/simulation/education-study-routine-hook.ts`

### #206 — WEEKEND19 B: additive fitted candidates and creation-lineage proof

`cursor/weekend19-modular-people-bdc5` at `0d4ffcba`, last touched 2026-09-12.

15 file(s) not on main:

- `art/manifest/character_candidate_visual4_generation1.json`
- `art/manifest/character_candidate_visual4_tone.json`
- `art/qa/people-visual4/wardrobe-requirements.json`
- `scripts/art-asset-factory/cli-people-visual4-arm-mask.ts`
- `scripts/art-asset-factory/cli-people-visual4-tone.ts`
- `scripts/art-asset-factory/cli-people-visual4-wardrobe.ts`
- `scripts/art-asset-factory/people-visual4-arm-mask.test.ts`
- `scripts/art-asset-factory/people-visual4-arm-mask.ts`
- `scripts/art-asset-factory/people-visual4-instrument.test.ts`
- `scripts/art-asset-factory/people-visual4-source-lineage.test.ts`
- `scripts/art-asset-factory/people-visual4-source-lineage.ts`
- `scripts/art-asset-factory/people-visual4-tone.ts`
- `scripts/art-asset-factory/people-visual4-wardrobe.ts`
- `scripts/dev-lab/appearance-recipe-v2-proof.test.ts`
- `src/presentation/weekend19-modular-people.test.ts`

### #242 — D33: existing private controller background Play and compatible staging

`codex/d33-desktop-compatible-update` at `8f554fe0`, last touched 2026-09-14.

8 file(s) not on main:

- `desktop/private-controller/controller-activation.mjs`
- `desktop/private-controller/controller-status.mjs`
- `desktop/private-controller/controller-view.mjs`
- `desktop/private-controller/owned-process.mjs`
- `desktop/private-controller/update-compatibility.mjs`
- `desktop/tests/controller-activation.test.mjs`
- `desktop/tests/controller-background.test.mjs`
- `desktop/tests/controller-owned-process.test.mjs`

### #251 — STORE: Steam Coming Soon submission packet

`cursor/steam-coming-soon-packet-2641` at `bbf09de0`, last touched 2026-09-14.

35 file(s) not on main:

- `docs/store/coming-soon-submission/01-store-copy.md`
- `docs/store/coming-soon-submission/02-feature-claims-and-evidence.md`
- `docs/store/coming-soon-submission/03-tags-and-steamworks-fields.md`
- `docs/store/coming-soon-submission/04-ai-content-disclosure.md`
- `docs/store/coming-soon-submission/05-content-survey-draft.md`
- `docs/store/coming-soon-submission/06-graphical-assets.md`
- `docs/store/coming-soon-submission/07-gameplay-captures.md`
- `docs/store/coming-soon-submission/07-screenshot-capture-request-for-A.md`
- `docs/store/coming-soon-submission/08-missing-owner-decisions.md`
- `docs/store/coming-soon-submission/09-valve-requirements.md`
- `docs/store/coming-soon-submission/INDEX.md`
- `docs/store/coming-soon-submission/capsules/artwork-only/README.md`
- `docs/store/coming-soon-submission/capsules/artwork-only/hashes.json`
- `docs/store/coming-soon-submission/capsules/artwork-only/header_capsule_920x430_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/library_capsule_600x900_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/library_header_920x430_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/library_hero_3840x1240_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/main_capsule_1232x706_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/page_background_1438x810_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/small_capsule_462x174_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/artwork-only/vertical_capsule_748x896_artwork_only.png`
- `docs/store/coming-soon-submission/capsules/titled/README.md`
- `docs/store/coming-soon-submission/capsules/titled/hashes.json`
- `docs/store/coming-soon-submission/capsules/titled/ocd_app_icon_184x184.jpg`
- `docs/store/coming-soon-submission/capsules/titled/ocd_header_capsule_920x430.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_library_capsule_600x900.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_library_header_920x430.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_library_logo_1280x720.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_main_capsule_1232x706.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_page_background_1438x810.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_shortcut_icon_256x256.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_small_capsule_462x174.png`
- `docs/store/coming-soon-submission/capsules/titled/ocd_vertical_capsule_748x896.png`
- `docs/store/coming-soon-submission/screenshots/README.md`
- `docs/store/coming-soon-submission/scripts/composite-wordmark-capsules.py`

### #253 — WORLD39: News orientation and Journal biography readers

`cursor/world39-news-journal-c615` at `ba8b6995`, last touched 2026-09-14.

6 file(s) not on main:

- `src/player/JournalReader.tsx`
- `src/player/journal-reader.css`
- `src/presentation/life-biography.test.ts`
- `src/presentation/life-biography.ts`
- `src/presentation/news-orientation.test.ts`
- `src/presentation/news-orientation.ts`

### #254 — UX39: creator appearance, calendar grid, People Web, menu copy

`cursor/ux39-creator-nav-calendar-a942` at `b174a543`, last touched 2026-09-14.

5 file(s) not on main:

- `src/presentation/calendar-grid.test.ts`
- `src/presentation/calendar-grid.ts`
- `src/presentation/date-display.test.ts`
- `src/presentation/date-display.ts`
- `tests/e2e/ux39-creator-nav.spec.ts`

### #273 — Post-merge modular people: generation-16 composition on main (E/Astra 5cefbba4)

`claude/postmerge-modular-receiver` at `65f7704b`, last touched 2026-09-19.

53 file(s) not on main:

- `desktop/tests/hub-pack-generation.test.mjs`
- `scripts/art-asset-factory/modular_fit/README.md`
- `scripts/art-asset-factory/modular_fit/fit_core.py`
- `scripts/art-asset-factory/modular_fit/freeze.ts`
- `scripts/art-asset-factory/modular_fit/install_compatible_pack.py`
- `scripts/art-asset-factory/modular_fit/install_private_pack.py`
- `scripts/art-asset-factory/modular_fit/intake.py`
- `scripts/art-asset-factory/modular_fit/prepare.py`
- `scripts/art-asset-factory/modular_fit/prepare_poses.py`
- `scripts/art-asset-factory/modular_fit/rig.py`
- `scripts/art-asset-factory/modular_fit/source_parts.py`
- `scripts/art-asset-factory/modular_fit/test_expressions.py`
- `scripts/art-asset-factory/modular_fit/test_install_compatible_pack.py`
- `scripts/art-asset-factory/modular_fit/test_install_private_pack.py`
- `scripts/art-asset-factory/modular_fit/test_intake.py`
- `scripts/art-asset-factory/modular_fit/test_material_sampling.py`
- `scripts/art-asset-factory/modular_fit/test_rig.py`
- `scripts/art-asset-factory/modular_fit/test_supplied.py`
- `scripts/art-asset-factory/modular_fit/test_underlap.py`
- `scripts/art-asset-factory/modular_fit/verify.mjs`
- `scripts/dev-lab/modular-baseline-comparison.test.ts`
- `scripts/dev-lab/modular-postmerge-browser.ts`
- `scripts/dev-lab/modular-r1-browser.ts`
- `scripts/dev-lab/modular-r1-fixture.tsx`
- `scripts/dev-lab/modular47-historical-browser.ts`
- `scripts/dev-lab/modular47-viewport-browser.ts`
- `scripts/dev-lab/private-modular-test-inputs.test.ts`
- `scripts/dev-lab/systemic-modular-browser.ts`
- `src/player/appearance-labels.test.tsx`
- `src/player/material-group.test.tsx`
- `src/player/prepared-labels.test.tsx`
- `src/player/raster-material.test.ts`
- `src/player/raster-material.ts`
- `src/presentation/appearance-lifecycle.ts`
- `src/presentation/modular-source-kit.test.ts`
- `src/presentation/modular45-people.test.ts`
- `src/presentation/prepared-profile.test.ts`
- `src/presentation/private-test-inputs.ts`
- `src/presentation/sha256.test.ts`
- `src/presentation/sha256.ts`
- …and 13 more under the same directories.

### #274 — Storage guard: registered workspaces, reserved headroom, bounded output, dependency-aware retirement

`claude/storage-guard` at `46b0f9da`, last touched 2026-09-19.

4 file(s) not on main:

- `scripts/storage/cli.mjs`
- `scripts/storage/storage-guard.d.mts`
- `scripts/storage/storage-guard.mjs`
- `scripts/storage/storage-guard.test.mjs`
