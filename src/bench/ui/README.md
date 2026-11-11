# The UI system

One system draws every screen. A size, a corner or a color is named once, a
control is built by one part, and a screen is put together from those parts. So
a change to how the game looks is made in one place and every screen follows.

Owner, Nov 10, 2026: "Make sure that the UI system is unified so that when it's
time to adjust the UI in the future, or I release new features in the future,
that it's way easier to change stuff on a screen or on a menu or something."

The look itself is his: `docs/mocks/2026-11-07-approved/MENU-LOOK.md`, with his
rulings screen by screen under `docs/mocks/2026-11-07-approved/specs/`.

## The three layers

1. **Names** (`:root` at the top of `src/bench/play.css`). Sizes, corners,
   fonts and colors, each with a name: the type scale (`--t-label` 14px,
   `--t-ui` 15px, `--t-read` 17px, `--t-h3` 20px, `--t-h2` 26px, `--t-h1`
   34px, `--t-name` 40px, `--t-display` 58px), `--control-h`, `--control-pad`,
   `--control-radius`, `--control-font`, `--pick-*` for list rows, `--head-*`
   for heading strips, `--cream`, `--gold` and the rest. A rule reads a name
   with `var(--name)`. It never types its own pixel size, corner or color.
2. **Parts** (this folder). One file per control or layout: `button.mjs`,
   `tab.mjs`, `panel.mjs`, `section.mjs`, `strips.mjs`, `list-row.mjs`,
   `roster-screen.mjs`, `split-screen.mjs`, `pager.mjs`, `toast.mjs`,
   `talk-box.mjs` and so on. A part builds the markup and gives it its one
   class. Its look is one block of rules in `play.css` that reads the names.
3. **Screens** (`src/bench/play.mjs` and the `*-screen.mjs` parts). A screen
   calls parts and hands them records. It builds no markup of its own and
   writes no rule that restyles a control.

## How to change something

| You want to                              | Change                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| Make every button taller, or rounder     | `--control-h`, `--control-radius` in `:root`                 |
| Change the type on every button and tab  | `--control-font`                                             |
| Make every small label bigger or smaller | `--t-label` (he ruled labels about 14px, small text 15px up) |
| Make all reading text bigger or smaller  | `--t-read`                                                   |
| Change how a chosen list row lights      | `--pick-on`, `--pick-hover`                                  |
| Change every heading strip               | `--head-font`, `--head-wash`                                 |
| Change a color everywhere                | its name in `:root`                                          |
| Change how one kind of control is built  | its part in this folder, and its one block in `play.css`     |
| Change what a screen shows               | the screen's function; it only chooses parts and hands data  |

## How to add a screen

1. Find the approved look for it (the mock and the specs above). No approved
   look, no screen: ask the owner through the CTO, with screenshots.
2. Pick the layout part: a list beside its page is `rosterScreen`; two columns
   of sections is `splitScreen`; sections down the panel are `strips.mjs`.
3. Fill it with parts: `makeButton`, `tabs`, `pickRow`, `section`, `factRow`.
   If a control you need has no part, add the part here, with one class and
   one block of rules that reads the names. Then move any older copy onto it
   in the same change.
4. Run the screen's browser check (`src/bench/<screen>.browser.mjs`) on the
   bench at 1440 by 900 in a drawn place, and look at the screenshot.

## The pick list

A list a player picks from, beside the page of what is picked (People, the
Guide, Elections, Parties, Issues, Bills), is always these three from
`list-row.mjs`, inside a container with the class `pick-list`:

- `pickHead(text)`: the heading strip.
- `pickGroup(text)`: a small heading over a group of rows.
- `pickRow({ label, aside })`: one row. `aria-pressed="true"` marks the chosen one.

A `className` passed to them is a hook for the screen's own checks. It never
carries a second look.

## People on a menu are busts

A person on a menu is a bust: a head, a top, facial hair and hair, stacked on
one canvas. `src/bench/bust.ts` picks a person's pieces from their record and
puts them on the person's face record (`face.bust`). `bust.mjs` here is the
only part that draws one. `bust()` in `strips.mjs` (the big bust on You, the
person card and a leader) and `headshot()` (the round face in a list) both
call it. The art, its manifest and the spec the painter works to:
`art/busts/v1/` and `docs/art/busts-spec.md`. A new piece is a file and a row
in the manifest; no screen changes.

## The guards

- `tests/guards/kit-only-ui.test.ts`: no file outside this folder builds
  markup. Its count is zero and stays zero.
- `tests/guards/ui-tokens.test.ts`: counts the font sizes, corners and hex
  colors still typed by hand in `play.css`. The counts in
  `ui-tokens-baseline.json` may only go down. Lower them as you move values to
  names.

## What is not unified yet (Nov 10, 2026)

- 11 font sizes are still typed by hand: titles that grow with the window
  (`clamp(...)`), which need a scale step that grows too.
- 61 hex colors and 12 corners are still typed by hand.
- The Journal, patch notes and Travel lists do not use the pick list yet.
