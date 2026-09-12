# RECOVERY25 brand candidates

The two packaged concepts below are **rejected exploration history**, not a
selected or released identity. Do not refine, ship, publish, or use either as a
replacement identity.
Nothing in this directory changes the app ID, product/storage name, save profile,
code-signing identity, current title implementation, or any store asset.

The current owner-review deliverable is the single black-and-white breadth sheet
at `review-10/our-civic-duty-10-rough-directions-contact-sheet.png`. Its ten
directions are deliberately rough and unselected; the repeated title placements
are mockups over the current title art, not application changes.

## Option 1 — Civic Roundtable

Four open seats face a shared square table. The gaps are intentional: the mark
describes participation without becoming a seal, badge, party emblem, ballot,
or government insignia.

- `option-1-civic-roundtable/wordmark.svg` — editable title wordmark for dark art
- `option-1-civic-roundtable/wordmark-on-light.svg` — editable light-ground variant
- `option-1-civic-roundtable/mark-one-color.svg` — editable monochrome mark
- `option-1-civic-roundtable/app-icon.svg` — editable 1024-square icon source

## Option 2 — Open Threshold

Two offset uprights, an open lintel, and a path make a civic threshold: an
invitation into a shared place rather than a depiction of a capitol, courthouse,
official seal, or campaign.

- `option-2-open-threshold/wordmark.svg` — editable title wordmark for dark art
- `option-2-open-threshold/wordmark-on-light.svg` — editable light-ground variant
- `option-2-open-threshold/mark-one-color.svg` — editable monochrome mark
- `option-2-open-threshold/app-icon.svg` — editable 1024-square icon source

## Type and color

The wordmarks retain #211's already-available display stack: Palatino,
`Palatino Linotype`, `Book Antiqua`, Georgia, `Times New Roman`, serif. No font
file is included. Context labels use the same system sans stack already used by
#211. The core palette is the accepted front-door navy/ivory/brass family:

- deep navy `#081521`
- ink navy `#172432`
- warm ivory `#F5EBD4`
- civic brass `#E0C37A`
- focus gold `#F6C75A`

## Exports and mockups

`exports/` contains inspectable raster icon ladders, transparent wordmark PNGs,
and a Mac `.icns` candidate package.
`mockups/` contains two title views and two desktop/About/compact-menu views.
The title mockups use the current community-meeting art and reproduce #211's
localized left scrim and backed controls; they do not alter the shipping title.

To reproduce the exports and mockups from a checkout with Playwright installed:

```sh
node tools/brand-preview/recovery25/render.mjs
node tools/brand-preview/recovery25/validate.mjs
```

## Provenance and rights

All vector geometry and layout in this directory were authored for Our Civic
Duty by OpenAI Codex on 2026-09-12 from the written MORNING23/RECOVERY25 briefs
and the repository's #211 readability implementation. No logo, seal, campaign
asset, proprietary game mark, external image, or generated-image model output
was copied or used as a visual input. The title mockup's room raster is an
existing repository asset and retains its own manifest provenance and rights
status; it is not redistributed here as a new brand source.

Packaged-concept status: `rejected`; ten-direction sheet status: `owner-review`;
selection: `none`; identity publication: `none`.
