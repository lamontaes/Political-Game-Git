# Code can fit a top to a new body and clean art outlines by itself

You have set aside the older rules against code drawing fitted clothes and
rotating limbs, so the engine work can start without waiting on them. A small
test shows code can do two jobs now done by hand for each piece. It fitted one
top onto two test bodies of different builds by measuring them itself. It
removed the white speckle from the outlines of real hair and pants art. Art is
receiving this report directly as well, so Art and the CTO should agree who
owns which step first. One piece of Art work unlocks poses: one body with its
arms as separate pieces.

## What the test showed

All numbers below were measured by the test script. "Test bodies" are the
repository's simple lean, average and heavy fitting shapes, not painted art.

**Fitting.** A knit top drawn for the average test body was placed on the lean
and heavy test bodies. The code measured each body's outline from its own
transparency, row by row, and stretched each row of the top to match. It used
no stored fit report and no hand measurement. The table gives the worst
difference, in pixels, between the top's side edge and the body's side edge.

| Test body                          | As drawn                                      | After the code fitted it |
| ---------------------------------- | --------------------------------------------- | ------------------------ |
| Average, the body it was drawn for | 7, the top's own looseness                    | Not needed               |
| Lean                               | 23, with the top sticking out past the body   | 6                        |
| Heavy                              | 23, with the body's skin showing past the top | 9, no skin showing       |

The fitted results land near the top's own 7 pixels of looseness rather than
exactly on it. The heavy result is a little worse, and its side is slightly
stair-stepped on the comparison sheet. The likely cause is that the quick
version stretches one row at a time (inferred).

**Outline cleanup.** Generated art keeps light paint from its white generation
background along the outline, which shows as white speckle on dark scenes.
The code looks at a band 3 pixels wide along the outline. It recolors a pixel
there when it is at least 60 levels (out of 255) lighter than the paint just
inside, using that inside color. It never changes transparency, so shapes and
fits stay exactly the same. "Bright" below means an average color value above
170 out of 255. That is a different rule from the one that recolors, so more
pixels are recolored than were bright.

| Art                                    | Pixels in the outline band | Bright before | Bright after | Pixels recolored |
| -------------------------------------- | -------------------------- | ------------- | ------------ | ---------------- |
| Approved shoulder-length natural curls | 14,470                     | 5,039         | 0            | 5,985            |
| Candidate dress pants                  | 7,744                      | 3,105         | 0            | 4,013            |

Zero bright pixels does not mean the pants are clean. Small dark specks
detached from the seams remain, and need a separate rule.

## What this does not prove yet

- **Painted clothing was not fitted.** The fitting ran on simple test shapes.
  Painted art will probably need the band edges smoothed (inferred; not
  tested).
- **Intentional light edges would be darkened.** By how the rule works,
  white stitching or a light fabric along an outline would lose its light
  pixels (inferred; not tested). The in-game version
  needs a way to protect them, such as a per-asset setting or a mask.
- **Poses were not tested.** Read from the source: the game has no separate
  arm part, and arms are painted into the body (`character-components.ts:36-47`). There was nothing
  to rotate.
- **Low-resolution art still looks blocky.** Cleanup fixes color, not size.

## The engine this points to

The game today draws pictures that were fitted and cleaned offline, one piece
and one body at a time. The engine moves that work into code. The code locations below were read
from the source at main:

1. **Fitting when the game loads a character.** Each garment is stretched in
   horizontal bands to the character's body. The game already calculates this
   banded fit, but will not draw it: it withholds the garment with the message
   "No renderer in this repository draws bands" (`character-components.ts:3191`).
   Drawing the bands is the first thing to build.
2. **Outline cleanup when art is imported.** It runs once per piece, with the
   light-edge protection above.
3. **Automatic intake.** Adding a piece measures, cleans and registers it with
   no hand measurement. A person looks at the result and approves the look.
4. **Poses from a skeleton.** Arms and legs become separate pieces that rotate
   at the joints. The game already defines an 18-point skeleton for every pose,
   including shoulders, elbows, wrists, hips, knees and ankles
   (`pose-families.ts:80`). Standing, seated and gesturing then come from the
   same pieces.

Some things still need painted art: side, back and three-quarter views, hair
texture and hand detail. A front drawing cannot be turned into a profile.

## Who does what

- **Owner:** approves source art and how the result looks, as before. On
  September 24, 2026 you set aside D-079, which fits a garment only to the
  outline it was measured on, and D-084, which reports an arm hidden in the
  body instead of estimating it. They were written for the earlier
  hand-fitted approach. The CTO should note in the decision log that they no
  longer apply to engine-drawn garments and limbs; that note does not hold up
  the work.
- **CTO and engineering:** build steps 1 to 3 on a branch, then test them on
  the current man and woman in Creator.
- **Art:** deliver one current body with its arms as separate pieces, and
  paint the part of the torso the arms normally cover. That unlocks the pose
  proof. Also list any intentional light edges in current pieces so the
  cleanup can protect them.
- **Together:** Art and the CTO agree on the file layout for separate arms
  before Art paints, so the first delivery fits the skeleton.

## Method

Run on September 24, 2026 in an isolated scratch folder, outside the game
code, against main at `c59daf596`. The script, `engine_proof.py`, is uploaded
next to this report in the shared Drive folder. Run it from a checkout of the
repository with Python 3, numpy and Pillow:
`python3 engine_proof.py <repository folder> <output folder>`. It writes both
comparison sheets and prints these numbers in about one second, reading only
existing repository art. A first cleanup attempt skipped solid outline pixels
and was replaced by the version above. No game file was changed, and nothing
was approved.
