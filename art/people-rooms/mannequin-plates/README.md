# Mannequin plates (people pack v3)

Owner, Oct 28: "do not put people in until there are mannequins in there for every position."

Per scene: `<scene>-mannequins.png` (the room repainted with green mannequins in the exact poses used; data only, never drawn) and `<scene>.mannequins.json`:

- `spots[]`: `pose`, `seat`, `facing` (the pack's terms), `head` {top, x, width}, `box`, and `feet` (standing or seated on a couch or chair) or `hands` + `deskEdge` (seated behind a desk: only what is above the desk edge is drawn, plus the hands resting on it).
- `front` (only when furniture really stands in front): a mask PNG over the spot's `box`; after drawing the person, draw the room back through it. Oct 29: the earlier front masks were all room seen through the gap between a mannequin's legs or between an arm and its body, not furniture, and are removed; a front piece now counts only if it hides the body across at least 35% of the mannequin's width, and every cut hugs the mannequin's own black outline. None of the current scenes has one (the address and briefing desks use `deskEdge`).

Fitting a person: pick a pack figure with the same `pose` (then `facing`, then `seat`); scale so head top → feet (or head top → hands row) matches; center the head on `head.x`.

Scenes so far (backdrop → plate; each plate names its backdrop in its `backdrop` field): `house-suburban-living__night.jpg` → home; `white-house-colonnade__morning.jpg` → colonnade; `train-depot-platform__midday.jpg` → depot; `oval-office-standard__midday.jpg` → oval-office (the standard wide shot); `oval-address-standard__night.jpg` → oval-address-standard. The standard Oval plates replaced oval-briefing and oval-address, and their old backdrops (`oval-office-resolute`, `oval-address-close`) are retired. The CTO adds plates golden path first; a room with no plate shows no people.

Props (owner, Oct 29): nobody holds anything unless the scene calls for it (phones at a rally, papers at a hearing or the address desk, pen and paper at a desk); never books or clipboards at home. Pack figures that hold something carry a `prop` tag.
