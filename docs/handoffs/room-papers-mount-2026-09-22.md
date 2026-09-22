# Mounting the waiting list on the room's papers

**For whoever lands `claude/player-facing-text-client`.** This is the one step
that makes [#383](https://github.com/lamontaes/Political-Game-Git/pull/383)
real in the room, and it was left undone for one reason only: it needs two
files that branch is still writing in.

## Why it is not already done

At `becd3058`, `claude/player-facing-text-client` is unmerged and carries 537
changed lines in `src/player/PlayerGame.tsx`, 114 in `SceneBackdrop.tsx` and
15 in `SceneSurfaceLayer.tsx`. One writer per overlapping surface, so #383
changed only the Today block at roughly line 5,577, well clear of that
branch's last hunk around 5,116, and stopped there.

## What is already built and needs nothing

`projectHouseholdPapers(world, personId)` in
`src/presentation/household-papers.ts` returns each waiting entry with a
resolved destination — `commitment`, `person`, `surface`, `here`, or `none`
with a stated reason. It is pure, it is tested, and it returns exactly what
`projectToday(...).waiting` returns, in the same order and the same words.
Nothing about the mount needs to touch it.

## The mount

The anchor exists. `coffee-table-papers` is declared in
`src/environment/scenes/residence-apartment-living-production.ts` — kind
`desk-document`, `information_access: "personal-household"`, falling back to
"the folded newspaper painted on the table" — and today it renders as painted
decoration.

**Superseded, 2026-09-22, by the built mount (`3721530c`). Read the
correction, not the paragraph under it.** `.scene-backdrop-stage` — the
camera — carries `aria-hidden="true"`, so a control rendered inside it is
unreachable to assistive technology and invisible to Playwright's role
queries. The object layer has to be a **sibling of the stage**, exactly as
`scene-backdrop-people` already is, positioning itself from the slot's
`rect_percent` with the same `transform` math rather than inheriting the
camera's. What shipped is an optional `objects` prop taking
`SceneObjectMount { slotId, node }`, rendered as `.scene-backdrop-objects`
immediately before the people layer, failing closed when the scene declares
no such slot.

The original paragraph, kept so the reasoning can be argued with:

> The one design decision, and it is in your file rather than mine:
> **`SceneBackdrop`'s `children` render in the dock, outside the camera.** A
> papers object positioned in plate percentages has to go _inside_
> `.scene-camera`, beside `SceneSurfaceLayer`, or it will drift away from the
> table at every viewport. So the mount is a new optional prop — call it
> `sceneObjects` — rendered right after `SceneSurfaceLayer` within the camera
> div, and `PlayerGame` passes the papers object through it with the slot's
> own `rect_percent`.

Three rules the object has to keep, from the environment-interactivity
research answer, because they are the whole point of the family:

- Hover or focus **reveals**; deliberate activation **inspects**; only explicit
  commitment on the surface that owns the matter **performs**.
- Clicking must never silently spend time. `tests/e2e/day-waiting-leads-somewhere.spec.ts`
  already asserts that shape against the shell's own clock; copy it.
- Keyboard and pointer must reach the same action, and the list must stay
  reachable without the hotspot — the Calendar's Today is that alternative and
  already works.

## One thing to settle first, or state instead of deciding

`household-paper-surface-contents` is filed and unanswered: whether a
household's table should show _everything_ waiting, or only what physically
arrived. An offer made in a shop and a favour asked in a kitchen are both
waiting and neither is a piece of paper.

Until that comes back, mount the whole list and say so in a comment. Do not
invent a filter — an arrival channel does not exist on a work item today, so
any filter would be guessed rather than read, and the research answer warns
specifically against decoration used as a fake action target.

## The larger problem this does not fix

`docs/findings/2026-09-22-what-is-waiting-is-two-clicks-away.md`. Today lives
inside the Calendar, behind the corner cluster, so what is waiting on a
player is two navigations from where they are standing and nothing in the room
mentions it. This mount is the fix for that, which is why it is worth doing
rather than tidy.
