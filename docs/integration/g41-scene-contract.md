# G41 frozen room contact handoff

PEOPLE40 scene-only delta: `bb0636c32495660022ef48b93c5f7ea35db0b891`, parent A39 `32be6a1cf0721eb7d24bccf2d126e0188d22e98b` (descends from `826c584e`). Private unchanged B inputs are separately frozen at `2d720ea909b14d80025f053eac4191e0ce8ad064`; do not transplant that proof commit or the 5286 art branch into gameplay.

The machine-readable companion `g41-scene-contract.json` preserves exact registered anchors, raster hashes, occluder polygons and inherited unknowns before POSE41. Contact coordinates are percentages of the 1376×768 source plate. They are visual estimates, not physical measurements. Inherited seat declarations remain candidates pending pose-fit review; the workroom tile convention is not a surveyed ruler.

| Viewport | Uniform scale      | X offset | Y offset |
| -------- | ------------------ | -------- | -------- |
| 1280×860 | 1.1197916666666667 | −130     | 0        |
| 1200×720 | 0.9375             | −45      | 0        |

At DPR 1, `screenX = offsetX + sourceX × scale`, likewise Y. Background, people, furniture masks and surface landmarks use this same transform. Quiet/Talk share it. The frozen correction did not change the room pixels or crop.

The frozen 600×1200 man has alpha bounds (95,34)..(492,1169); metadata crown35 and soles1165. Canonical-03 standing height at depth scale1 is74% of plate height. The near floor is92%, far floor82%, with relative scales1 and0.75. One uniform actor scale uses crown-to-sole span, preserving width/body mass. Actual visible heights are639.21px and535.15px in the two viewports; frozen actual soles miss metadata by under2.3 screen pixels. These source-contact discrepancies are recorded rather than silently erased.

| Candidate place        | X    | Seat Y | Floor Y | Facing/acceptance                                              |
| ---------------------- | ---- | ------ | ------- | -------------------------------------------------------------- |
| Canonical03 foreground | 46   | —      | 92      | Front, standing verified                                       |
| Canonical03 entry side | 87   | —      | 82      | Front, middle-depth candidate; crop clearance needs next proof |
| Canonical03 sofa       | 69   | 59.7   | 79      | Front seated candidate; verify pose and actual cushion contact |
| Canonical03 club chair | 33   | 61.5   | 71      | Painted angle makes front-pose compatibility unaccepted        |
| Workroom kitchenette   | 16   | —      | 66      | Front standing candidate                                       |
| Workroom middle floor  | 26   | —      | 82      | Front standing candidate                                       |
| Workroom near table    | 40   | —      | 94      | Front standing candidate; silhouette/occlusion proof required  |
| Workroom task chair    | 29.6 | 53.9   | 57.9    | Away; no front seated pose may use it                          |

G owns scene definitions, placement/composition/framing, actual-occupant allocation, SceneBackdrop and its scene-transform/overlay boundary, and additive scene CSS. Exact paths are in JSON. POSE owns additive art and its adapter; KIT owns creator/portrait consumers; B owns body/material/wardrobe assets and catalog. G does not alter those assets. The original first correction's `player.css` lines are frozen; next scene styling is additive.

Private proof: `output/people40-room-fit/comparison.html`, measurements and HANDOFF receipt in the shared project output. Pointer and keyboard Talk activation, unchanged actor/camera bounds and current “No time passed.” behavior passed. Human visual acceptance remains pending. The next increment is isolated on `codex/pose41-scene-occupancy` and will be handed A separately.
