# Poses at furniture (owner, Oct 28)

The owner: "taking some thing that already has like a desk or a podium or something, and then starting with the mannequin there so that way they can interact you know naturally with you know the microphone or the podium or whatever so that way, you know sizes and stuff like that can start to be relatively standardized to work with a lot of the same poses". And: "everyone just staring at you is super unnatural... People should be at all different poses and angles."

## How each pose is made
1. **Mannequin plate** (`../pose-plates/lp-*.png`, `dd-*.png`): a flat green mannequin painted into a painting already in the game, at its lectern, podium or desk, in a natural pose and facing (turned to the crowd, reading, pointing, seen from behind at a council lectern).
2. **Person** (`pa-*.png`): the same picture with the mannequin turned into a bald adult in a plain gray suit, same pose and outline.
3. **Marker** (`pm-*.png`): that person's clothes painted flat red jacket, yellow shirt, blue pants, green shoes.
4. **Cut** (`tools: inscene.py, export_pose.py` in the art session's notes): the person is the mannequin's outline plus whatever differs from the empty painting inside it; whatever the furniture hides stays painting. Clothes are labelled from the marker picture, with missed seams filled from the nearest label. The result is `poses/<id>.png` (gray person, transparent around), `<id>-garments.png` and `<id>.json`.

## Tags (`index.json`)
Same field names as `art/people-engine/v2/index.json`, plus: `interacts` (what the hands touch), `gesture`, `hairView` (which hair and face pieces fit the head: front, threeq, threeqr, back), `head` (top, centre, width in the figure), `frontEdgeY` (where the furniture's front edge crosses the figure), `boxInScene` and `sceneSize`.

## Using a pose at other furniture of the same kind
Scale by the two lecterns' widths, centre it on the new lectern, line `frontEdgeY` up with the new lectern's top edge, and hide what the new lectern covers. `lectern-*.json` hold the measured lecterns. `../pose-proof/same-pose-other-lectern.jpg` shows the inaugural pose at the election-night lectern; `../pose-proof/assembled.jpg` shows each pose assembled as three people (garment colors, skin, hair from `art/people-engine/v2/hair`).
