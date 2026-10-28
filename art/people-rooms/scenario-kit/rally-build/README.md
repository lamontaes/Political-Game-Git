# Rally built from the people kit (Oct 28, 2026)

Owner, Oct 28: "I just want people to be generated that look different, only using a limited amount of parts and stuff. That's all I'm trying to prove. Like I said, the Reddit way." Then: "build the scene".

## What is here
- `poses-<person>.png`: each of the six people (woman and man; slim, medium, heavy) drawn ten times in rally poses on one sheet (Nano Banana 2.1 with the person's 8-angle sheet as the reference): clapping turned left or right, fist raised, filming with a phone, arms folded, hand on hip, hands in pockets, front-facing clapping both ways, speaking.
- `layers/<person>/z1..z6.png` + `layers/<person>.json`: one Seedream 5.0 Pro Layerize run per sheet: body (bald, with the person's own painted face), trousers, shoes, top, hair, phone, each holding all ten figures, with the exact box and stacking order Scenario's job record gives (`/v1/jobs/<id>` → `metadata.output.layers`).
- `plate-try1.png`: the square with every person removed (Nano Banana edit of the generated rally).
- `scene.py spots-final.json out.jpg`: places every person. Sizes come from the square's own perspective (stature = 1.116 × distance below eye level, eye level at y 476 of 1400); each person is turned toward the speaker (left of the lectern: turned right; right of it: turned left; stage supporters face her). The lectern is cut from the plate and laid back over the speaker.
- `render.py`: one person = a body in one pose, keeping the drawing's own pixels; clothes and hair repainted to a palette keeping the drawing's shading; women can wear each other's hairstyles (the old hair is lifted, the bald head and completed top come from the parts, the new hair is fitted to the skull).
- `boards.py`: the side-by-side with the generated rally and the "how some of the crowd were made" sheet.

## Known limits
- The men's Layerize hair layers came back redrawn about 2.5× too big, and the medium man's body layer lost his mustache and lightened his skin. Men's hair is therefore taken from the drawing itself (where the drawing shows hair and the bald body shows scalp) and only recolored, never swapped. Light hair colors on the medium man bleed into his face; the heavy man grays cleanly.
- Hands in pockets reads as a stander (owner ruling: no arms-at-sides standers when someone is speaking); the final scene doesn't use it.
- Scenario links in the job records are signed; the signatures are stripped from the JSON here. `dl_layers.py` rebuilds a download link from an asset id plus a fresh signature read in the browser.
