# For PT3: two things hiding the people in the room

From the MODULAR-GEN14 provider owner. These are findings, not patches —
`src/player/` is PT3's and I have not touched it. Both are measured, both are
in the scene composition, and together they are the reason the art cannot be
judged in the room.

Observed at the default 1440×900, ordinary life, `?art-preview=candidate`,
`residence-apartment-living-ordinary-02`. Evidence and screenshots:
`docs/agent/evidence/modular-gen14/`.

## 1. The moment panel covers the figure from the chest down

Hit-testing a scene person token with `document.elementFromPoint`:

```
centre : blocked by section.game-story
upper  : PERSON
head   : nothing
```

The panel is `.life-shell .scene-backdrop-content`, fixed to the bottom and
centred, and its children take pointer events. Whatever stands behind it is
covered from roughly the chest down.

Two consequences:

- **Pointer selection only works on the part of the figure that is not behind
  the panel.** Keyboard is unaffected — focus and Enter reach the token
  normally — so an automated check that only presses Enter will not see this.
- **Clothing below the chest is invisible in the room.** Bottoms, footwear and
  the whole silhouette below the ribcage cannot be reviewed where the player
  actually is. This is the surface the owner is looking at when judging whether
  people look right.

I have not proposed a fix because the layout is yours. Worth knowing: the
figure is centred on its anchor, so anything that moves the panel off the
figure's column, shortens it, or makes it dismissible would recover the body.

## 2. The figure is cropped at the head

The token carries, from the compositor:

```
figure-taller-than-space-above-contact-line: 5.5% of the plate is above the
top edge, so this figure is cropped at the head.
```

That diagnostic is mine and it is working as intended — it exists because the
placement now keeps the feet on the anchor's declared contact line and lets the
overflow go off the top, rather than sinking the person through the floor as it
used to. In this room 5.5% of the plate goes above the viewport, which takes
the crown. Hit-testing at the head returns `nothing` for the same reason.

Faces are the thing a reviewer most needs to see, so a person cropped at the
crown and covered at the chest is visible only as a torso.

The 5.5% is a property of the room, not of the person: the reserved height
exceeds the distance from the top of the plate to the contact line at
`living-room-floor-standing`. It resolves either in the scene authoring (the
room's floor calibration question, which is open — see
`docs/agent/evidence/modular-gen14/WARDROBE-COVERAGE.md`) or in how the scene
camera frames a figure that does not fit. Both are outside my files.

## 3. The clickable token is narrower than the figure it draws

Measured in the same room, same seed:

```
figure token box      x 495 .. 850   (355 wide)
body layer as drawn   x 443 .. 901   (458 wide)
```

About 52px of the person, on each side, is painted outside their own button —
so the arms and the outer silhouette are not clickable.

This one is a consequence of a deliberate choice of mine and I should own it.
The preview's fallback fit takes ONE scale, from height, so the figure is never
anisotropically squashed; width then follows the art's own proportions and may
exceed the anchor's `footprint_percent`, which is a footprint estimate rather
than a measurement. That is the honest outcome for the art — a broad figure is
broad — but the token is still sized from the reserved box, so the interactive
region tracks the estimate instead of the pixels.

The fix is to size the token from the union of the drawn layers rather than
from the reserved box when the two differ. It is a couple of lines in
`SceneBackdrop`, and it is yours; say the word and I will hand you the exact
patch against whatever your head is, rather than editing it myself.

## Where a whole person can be looked at meanwhile

`?view=character-proof&set=visual4` — five named people, full figures, at
reviewable size, composing from **the same library the life path now uses**, so
it is not a second source of truth. That is the surface for a visual decision
until the two above are resolved.

## What I need from PT3

Nothing blocking. This is a heads-up so the room work and the people work do
not each assume the other will handle it. If you would rather I open a specific
issue against either, say which and I will write it up with the measurements.
