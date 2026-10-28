# Poses at furniture (owner, Oct 28)

The owner: "taking some thing that already has like a desk or a podium or something, and then starting with the mannequin there so that way they can interact you know naturally with you know the microphone or the podium or whatever so that way, you know sizes and stuff like that can start to be relatively standardized to work with a lot of the same poses". And: "everyone just staring at you is super unnatural... People should be at all different poses and angles."

## How each pose is made
1. **Mannequin plate** (`../pose-plates/lp-*.png`, `dd-*.png`): a flat green mannequin painted into a painting already in the game, at its lectern, podium or desk, in a natural pose and facing (turned to the crowd, reading, pointing, seen from behind at a council lectern).
2. **Person** (`pa-*.png`): the same picture with the mannequin turned into a bald adult in a plain gray suit, same pose and outline.
3. **Marker** (`pm-*.png`): that person's clothes painted flat red jacket, yellow shirt, blue pants, green shoes.
4. **Cut** (`tools: inscene.py, export_pose.py` in the art session's notes): the person is the mannequin's outline plus whatever differs from the empty painting inside it; whatever the furniture hides stays painting. Clothes are labeled from the marker picture, with missed seams filled from the nearest label. The result is `poses/<id>.png` (gray person, transparent around), `<id>-garments.png` and `<id>.json`.

## Tags (`index.json`)
Same field names as `art/people-engine/v2/index.json`, plus: `interacts` (what the hands touch), `gesture`, `hairView` (which hair and face pieces fit the head: front, threeq, threeqr, back), `head` (top, center, width in the figure), `frontEdgeY` (where the furniture's front edge crosses the figure), `boxInScene` and `sceneSize`.

## Using a pose at other furniture of the same kind
Scale by the two lecterns' widths, center it on the new lectern, line `frontEdgeY` up with the new lectern's top edge, and hide what the new lectern covers. `lectern-*.json` hold the measured lecterns. `../pose-proof/same-pose-other-lectern.jpg` shows the inaugural pose at the election-night lectern; `../pose-proof/assembled.jpg` shows each pose assembled as three people (garment colors, skin, hair from `art/people-engine/v2/hair`).

## What is covered (Oct 28)
21 poses: the inaugural lectern (hand raised, reading, pointing), the council public lectern seen from behind (making a point, leaning in), debate podiums (talking with the hands, a finger raised to speak, listening turned to the other speaker, a hand on the microphone), desks (the president writing, thinking, standing at the Oval Office window; a mayor leaning in to a visitor; a governor standing at the desk), visitor chairs seen from behind, the clerk counter (clerk and resident), and walking the colonnade. `pose-proof/montage-president.jpg` shows the president's montage moments assembled.

## Hair for heads turned away (Oct 28)
The hair set now has two more views: `prof` (exact profile) and `tqb` (three-quarter from behind), the same 12 styles per sex, in `art/people-engine/v2/hair-on-figures/prof|tqb/` with their figures `v2-prof-*`, `v2-tqb-*`; flip the figure and the piece together for the other side (`-m` in `hairView`). `pose-visitor-*`, `pose-counter-02` and `pose-desk-04` use them. Measure a head on the person's own outline; the mannequin's outline fits walking heads better (the colonnade walk).
