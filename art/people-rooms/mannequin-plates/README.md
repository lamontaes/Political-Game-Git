# Mannequin plates (people pack v3)

Owner, Oct 28: "do not put people in until there are mannequins in there for every position."

Per scene: `<scene>-mannequins.png` (the room repainted with green mannequins in the exact poses used; data only, never drawn) and `<scene>.mannequins.json`:
- `spots[]`: `pose`, `seat`, `facing` (the pack's terms), `head` {top, x, width}, `box`, and `feet` (standing or seated on a couch or chair) or `hands` + `deskEdge` (seated behind a desk: only what is above the desk edge is drawn, plus the hands resting on it).
- `front`: a mask PNG over the spot's `box`; after drawing the person, draw the room back through it (furniture painted in front of the mannequin).

Fitting a person: pick a pack figure with the same `pose` (then `facing`, then `seat`); scale so head top → feet (or head top → hands row) matches; center the head on `head.x`.

Scenes so far (backdrop → plate): `house-suburban-living__night` → home; `white-house-colonnade__morning` (art/backdrops-variants on this branch) → colonnade; `train-depot-platform__midday` (backdrops-variants) → depot; `oval-office-resolute__midday` → oval-briefing; `oval-address-close__night.png` (here; new backdrop) → oval-address. The CTO adds plates golden path first; a room with no plate shows no people.
