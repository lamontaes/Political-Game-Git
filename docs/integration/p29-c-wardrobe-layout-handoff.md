# P29-C wardrobe presentation handoff (for B)

B owns `PersonAppearanceControls` transaction/support logic and
`WardrobeFigure` pose/resolver behaviour. C made **layout/label-only** edits
in those files so the player can read choices and see the whole figure in the
Personal panel. Do not treat this as a resolver or autosave change.

## What C changed

- `WardrobeFigure.tsx`: the preview stage fills the available panel width with
  `aspect-ratio: 300 / 560`. The render **plate remains 300×560**. Modular
  character geometry is untouched. Seated remains offered here until B's
  complete-outfit resolver disables unsupported poses.
- `PersonAppearanceControls.css`: `.wardrobe-figure` / `.wardrobe-figure-stage`
  layout only.
- `SavedAppearance.tsx`: passes `familyLabels` from
  `catalogFamilyLabels(...)` so selects show "Cardigan rust" instead of
  `top 1`. Catalog ids stay on the option values. NPC copy now says this is
  not the controlled person.

## What B should keep / replace

- Complete-outfit validation before autosave (P29-B).
- Do not offer Seated when the resolver says the pose is unsupported.
- Replace C's title-case labels with authored player names when those exist;
  keep diagnostic ids in developer evidence.

C will not edit the preference-commit path in `PersonAppearanceControls`.
