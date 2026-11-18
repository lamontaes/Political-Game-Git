# Menu test: the owner's rules for the mocks

## Hard rules (keep every one)
- One dark, see-through panel per menu (about 78% solid, the room shows through), with a slim brass edge. Small brass corners on that panel are the only corner ornaments.
- No box around every item. No framed plate per row, no hairline rectangles, no thin gold rules between sections. Group by spacing, type and art.
- Hover: a soft fill with a frame that fades out before the corners, plus warm light. Selected: a lit brass fill. No chevrons, no left bar on rows, no corner marks on controls.
- Data shown as data: real numbers and words. No sliders, no bar graphs, no pie charts, no checkboxes.
- Text at least 15 px (labels about 14 px, all caps with letter spacing). Fonts: Cinzel for titles only, Andada Pro for narrative, Fira Sans with tabular digits for figures (`public/fonts/kit12/`).
- Portraits are crops of the game's own people (`art/busts/v1/sheets/`), lit evenly in a soft pool of light. Never in a circle or a box.
- The menu never scrolls as a page. No dead space, no captions explaining a control, no developer text. American English.

## Free to decide (this is the test)
- The layout, the focal point, what's big and what's small.
- Painted UI art in the game's hand-drawn style (thin even ink lines, flat color, one shadow tone): panel frames, header plates, dividers, seals, emblems, icons. Make it with your image tool, or draw it in SVG.
- Putting the scene's own painting and people into the screen, so it feels like a place, not a form.
- Small motion: hover glow, a settle when the menu opens.

## The look to match
`approved-nov5/menu-outline-options.html` (open it in a browser) is the panel, hover and selection look the owner approved on Nov 5. The game's room paintings are in `art/backdrops/`, and its approved controls are in `public/ui/kit13/approved-controls-sheet.png`.
