# PLAYTEST-UI9 — item-by-item result

Role A (UI-FINISH8), continuing the same PR. No main merge and no art approval
from this role. The owner's frozen play copy and port 5188 were never a target;
every browser run here used port 5391 with served-checkout verification.

**Settled defects are separated from tentative preferences below.** UI9-08
(conversation duration), UI9-16 (palette, motion), the DOB-editing policy half
of UI9-10 and the portrait-placement half of UI9-09 are recorded as proposals
and were deliberately NOT implemented: they are global timing and style
decisions the owner is explicitly unsure about, and this role has no mandate to
settle them silently.

## Implemented

| #      | Finding                                                 | What changed                                                                                                                                                                                                                                                                                                                            | Proof                                                                           |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| UI9-01 | Duplicate Day/Work/scene routes                         | The day mounted the education-and-work stack and the private personnel panel in full; Work mounted the same two again. Work owns study and jobs; the day links into that same workspace. The redundant "The room" menu entry is gone — every workspace frame already carries Close, which dispatches exactly it. No system was removed. | `civil-work7-normal-route`, `career-path7`, `life-paths2` all pass through Work |
| UI9-02 | Who you are and Money and property were one destination | Views carry a section. Identity opens the record at the person; finances opens it at the money and focuses it. Identity now precedes the economic context, which is kept and restated as being about the place. The three purses stay separate.                                                                                         | `ui9-owner-corrections` asserts both destinations and the order                 |
| UI9-03 | People roster beside the pin rail                       | The rail carried everyone present, then the whole generated household, then anyone the life kept returning to. It now shows who is in the room. Contact browsing stays in People — which gained the pin control, so pinning somebody not in the room is still possible.                                                                 | `ui-core` mixed pins, `scene-first-shell`                                       |
| UI9-04 | Place/government shortcuts unsupported                  | `ShellRef` gained a `government` kind resolving through the compiled registry, a pin control on the municipal surface, and the saved-navigation allowlist entry without which the pin vanished on reload. Reopening one selects that government and nothing else.                                                                       | `ui9-owner-corrections` pins, saves, reloads, reopens                           |
| UI9-06 | Walk home offered at home                               | Nine refusals inside `walkOpeningNeighborhood` all returned the unchanged world. They are now resolved once and shared with an offer projector; buttons follow the offer and show the real reason.                                                                                                                                      | `ui9-owner-corrections` checks both refusals and that they swap after walking   |
| UI9-07 | Continue/time semantics                                 | A committed action reports the before and after clock, the date when it moved, and where it left the character.                                                                                                                                                                                                                         | same                                                                            |
| UI9-11 | Release notes and version                               | Normal notes list accepted releases only, cumulatively, each with its version and its date or an honest statement that no date is recorded. The running version is on the title screen.                                                                                                                                                 | `ui-core` patch notes                                                           |
| UI9-13 | Current bill versus reference bill                      | The docket selection is named as the measure being worked on; an assignment pointing at a different measure is named separately as the other document. Both pin controls name what they pin.                                                                                                                                            | typecheck, lint; browser coverage pending below                                 |

## A defect found while fixing these

`PRE-ALPHA 0.3.0 — "A Life, Not a Fixture" — CANDIDATE, NOT YET ACCEPTED` was
being reported to players as a shipped release. `release-identity.ts` classified
anything whose heading did not say UNRELEASED as released, while the release
tooling has always treated a CANDIDATE heading as a reserved number. A reserved
version was being shown as one the player had. The presentation now applies the
tooling's rule. The unit test that existed here asserted the weaker rule, so it
was a statement of the defect rather than a guard against it, and now pins the
case that was wrong.

## Recorded as proposals, deliberately not implemented

- **UI9-08** conversation duration. The owner is unsure whether exchanges should
  cost time. Changing it means changing global clock rules, and "I'm not sure"
  is not a mandate to do that. The existing principle stands: reading and
  navigating are free, meaningful actions cost believable time.
- **UI9-16** palette and motion. "The black doesn't work" is a direction, not a
  replacement palette, and no guessed one was applied. Reduced-motion support
  and the approved visual direction are untouched.
- **UI9-10 (part)** optional DOB editing. The numeric-age editing buffer is a
  settled defect and is listed below as still open; the DOB _policy_ is a
  product decision for the next coherent checkpoint.
- **UI9-09 (part)** exact portrait placement. "Right here maybe" in a 640×360
  recording does not settle a layout.

## Still open, with named owners

- **UI9-05** discoverable place/travel destination. Partly served by the
  government pin, which gives a stable way back to a government. A general
  Places route with Inspect / Travel to / Attend / Return home is not built.
- **UI9-09** guardian opening exchange. Not implemented.
- **UI9-10** age input buffer: `Number(event.target.value)` still writes 0 for an
  empty field, which is the owner's "0-2-5". Not yet repaired.
- **UI9-12** raw research presentation. The municipal surface still shows
  external source links in normal play. The current-place line and pin were
  added; the external-link and search-first work is not done.
- **UI9-14** awaiting referral. Not diagnosed here. It needs an actual save,
  measure stage, actor and time reproduction, and belongs at the LEG/time
  integration seam rather than being guessed at from the UI.
- **UI9-15** campaign feel. Untouched; it is a balance review, not a defect.

## Visual set

`01-normal-scene.png`, `02-normal-dossier-wardrobe.png`, `03-normal-creator.png`,
`04-normal-work-study.png`, `05-normal-news.png`, recaptured on the corrected
build with the served checkout verified. **Not an art approval.** The work and
study panel's presentation defects reported in the previous return — duplicated
heading, inconsistent institution rows, clipped last row — are unchanged and
remain open.

## Browser evidence, and what it exposed

The Playwright suite was collecting **zero tests** on this branch and had never
run. `municipal-capacity.ts` imported its generated JSON without an import
attribute; Vite and Vitest transform that, native Node ESM — which Playwright
uses to collect spec files — does not, and it throws during collection. The run
reported `Total: 0 tests in 0 files` with no failing test to point at, and every
filtered per-spec run passed, which is how it survived. Reported by D, diagnosed
by C, verified here.

Reachable only through this branch's own composed specs: `municipal-member`
imports `municipalWorkspaceFor`, which reaches municipal-capacity. That spec is
in neither accepted main nor the MUNI donor.

**Remedy taken: the import attribute, not decoupling the spec.** The spec's own
runtime is Node too, so a dynamic import hits the same restriction, and the only
way to keep presentation out of its graph is to delete the canonical-state
assertions it makes. Paying real coverage to avoid one attribute is the wrong
trade. Every other bare JSON import is untouched — nothing else is reachable
from a spec, which is why the convention is fine everywhere else, and that
reason is written at the import site.

`tests/browser-suite-collects.test.ts` now asserts every spec on disk is
collectable, so the next unloadable module fails in the unit suite instead of
silently emptying the browser run. Verified by removing the attribute.

### Attribution of the first full run

360 passed, 27 failed. Re-run at the pre-UI9 head (`ff0a5b32`) with only the
collection fix applied, **23 of the 27 fail identically**. They are #144's, and
they were hidden behind a suite that collected nothing — not caused by the UI9
corrections and not fixed by them. They span `pennywise-adaptive-life` (7),
`packet77-presentation` (4), `owner-play-repair` (3), `legislation-docket` (2),
and one each in `ui-converge4`, `scene-authoring`, `people1-r1`,
`p2r2-sustained-play`, `p2r1-editorial`, `edu-path7`, `character-context` and
`campaign-first-election`.

One of them is worth C's attention specifically: `packet77` fails on
`life-introduction`, a section main renders and #144's base does not. The
composition therefore drops a behavior main has. That is a merge decision for
the LAND owner, not something to restore unilaterally here.

**Four were mine, all repaired**, and one of those was a real regression rather
than a stale test: Work mounted study and jobs only for lives without a
legislative office, so removing the day's duplicate copy left an office-holding
character with no route to them at all. Work owns those panels for every life
now.

Re-run after the repairs: **364 passed, 23 failed**, and the 23 are exactly the
pre-UI9 baseline set — a set difference against the baseline failures is empty.
Nothing new was introduced.

## Unit suite

273 files, 4238 passed, 2 skipped, 0 failed, with bounded workers.

---

# UI-COMPLETE10 continuation — disposition at 6a0e4487

Same PR, same owner role. This section records what changed after the 4310af1d
attribution above, and what is still open. It does not restate that report.

## The publication gate

The hosted run failed `release:check` on the push range 241115c3..4310af1, not
on the PR range: two non-declaration paths with no declaration. The PR-scope
check passed the whole time, which is why it looked like nothing was wrong.

The changed image was **not** an intentional recapture. Five capture sites wrote
screenshots directly into `docs/agent/evidence/`, so every browser run redrew
identified historical captures as a side effect; it happened under
"repair the four cases I broke" (three images) and again under "record the
browser attribution" (one). `verify-evidence.ts` refuses this at run time and
stays, but it compares against the tree as the run starts — committing the drift
makes the changed bytes the next baseline and the guard goes quiet.

Repaired: the three images are restored to their identified capture at 44aea4bf;
every capture site writes to the run's own artifact directory; banking one into
tracked evidence now takes an explicit env gate; and
`tests/captures-stay-out-of-tracked-evidence.test.ts` holds the specs to it,
verified by reintroducing both forms of the old code.

## Items closed since 4310af1d

| #                            | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI9-10                       | **Closed.** The age field holds its own text; the setup keeps the last age that parsed. Browser proof walks the owner's "0-2-5".                                                                                                                                                                                                                                                                                                                              |
| UI9-14                       | **Diagnosed and closed at this seam.** The docket collapsed `drafting` and `awaiting-referral` into one "Filed, awaiting referral", so a bill still being written reported itself filed and waiting on somebody else. Drafting is now its own stage. Whether a filed bill is then referred remains LEG/time work.                                                                                                                                             |
| Work/study duplicate heading | **Closed.** The frame and the panel inside it both drew "Education and work".                                                                                                                                                                                                                                                                                                                                                                                 |
| Duplicate study search       | **Closed.** The education proof mounted the options panel directly and through `LifePathsPanel`, so "Search institutions" resolved to two boxes and `edu-path7` could fill neither.                                                                                                                                                                                                                                                                           |
| U-1                          | **Verified, unchanged.** The loader test is honest and already says it is not producer replay.                                                                                                                                                                                                                                                                                                                                                                |
| U-2                          | **Closed.** `npm run education:check` replays the real exporter from the artifact lock and compares byte for byte (132,874 institutions, ~8s); it is in `validate`. Five negative controls executed: altered manifest, missing manifest, one flipped catalog byte, a lock pinning a digest the bytes do not have, and a removed raw source. All exit 1 with the specific reason.                                                                              |
| Life introduction            | **Preserved in the new shell.** `projectOpeningLife` already calls the same `buildLifeIntroduction` main renders, and the opening panel's household phase shows the same sentences and grounding. What was missing was the way in, so the panel now carries `life-introduction`, `life-grounding` and `introduction-continue`, and the spec walks to where the household is said. The permanent people rail main paired it with is deliberately NOT restored. |

## Still open, with the evidence for each

- **UI9-05** discoverable Places and real travel. Not built. The destination list
  has no Places entry; travel exists only as the life-scene walks.
- **UI9-12** raw research presentation. Not repaired. `municipalWorkspaceFor`
  already resolves the player's home government first, so current-locality-first
  is the default; the defect is presentation — the surface still renders Census
  dataset links, per-source `<a href>` citations and a raw public-reference URL
  list in normal play.
- **UI9-09** guardian opening exchange. Not implemented.
- **pennywise-adaptive-life (7 failures)** — the calibration screen. A run ends
  with "Who are you?" still on screen and `play-screen` never mounting. Not the
  introduction: the panel is gone by then. Not diagnosed further.
- **legislation-docket (3)** — `elsewhere-work` never appears after `enterLife`.
- **packet77 (2 remaining)** — title randomness, and normal-versus-custom build.

## Browser harness in this checkout

This container ships Chromium 1194 while `@playwright/test` 1.62.1 resolves
build 1234, so a plain run fails every test before a body executes — 776 result
directories, zero tests run. Every browser figure here was produced through a
local config that points the repository's own config at the installed binary and
changes nothing else; it is deliberately not committed. The 364/23 baseline
above was measured on a working harness and has NOT been reproduced identically
here, so this section reports what its own runs showed rather than claiming that
number.

One run was invalidated by editing source while it was in flight; the served
checkout guard caught it (`Served checkout mismatch: sourceDigest`) and that
inventory was discarded rather than used.
