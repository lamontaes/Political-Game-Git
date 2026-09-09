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
