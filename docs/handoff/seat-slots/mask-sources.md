# Person-mask provenance

All 286 original Firefly JPEG versions now have independent masks from torchvision Mask R-CNN ResNet-50 FPN V2, COCO V1 weights: person confidence at least 0.8, mask probability at least 0.5. Each `<version>.persons/provenance.json` identifies the input, SHA-256, source dimensions, model, and per-person masks. Neither the old masks nor backdrop differences define these masks.

Native image-generation replacements are saved in the school board, county commission, rural county commission, and large council source folders, with their prompts and alpha-mask provenance. Other rooms reuse those sources through `generated.json`. Original generated sheets and rejected attempts are retained. Individual figures were separated at transparent gutters; their pixels were not repaired.

Empty-room chair masks come from chair/bench detections. Chair anchors and foreground desk polygons include one-time manual annotations, described in each `chairs.json`. Rejected source candidates and diagnostic reasons are saved under each room's `rejected/` folder. No rejected candidate is repaired or reattached as fragments.

## Historical masks retained for reference

The notes below describe the previous pipeline, not the masks used by the rebuilt atlases.

### Previous mask source per crowd version

Old crowd-v* and sparse-v* versions: Adobe image_select_by_prompt ("all the seated people").

Adobe: x-bic-01 x-bic-02 x-bic-03 x-bic-04 x-bic-05 x-bic-06 x-bic-07 x-bic-09 x-bic-10 x-ccl-01 x-ccl-03 x-ccl-05 x-ccl-07 x-ccl-09 x-ccr-01 x-ccr-03 x-ccr-05 x-ccr-07 x-ccr-09 x-ccs-01 x-ccs-02 x-ccs-03 x-ccs-04 x-ccs-05 x-ccs-06 x-pmr-01 x-pmr-02 x-pmr-04 x-pmr-06 x-sen-01 x-sen-02 x-sen-04 x-sen-06 x-sen-07 x-sen-08 x-sen-09 x-uni-01 x-uni-02 x-uni-03 x-uni-05 x-ush-01 x-ush-02 x-ush-04 x-ush-06

Local fallback (local_mask.py, after the Adobe token expired): w-sen-01 w-sen-02 w-sen-03 w-sen-04 w-sen-05 w-sen-06 w-sth-01 w-sth-02 w-sth-03 w-sth-04 w-sth-05 w-sth-06 w-sth-07 w-sth-08 w-sth-09 w-sth-10 w-uni-01 w-uni-02 w-uni-03 w-uni-04 w-uni-05 w-uni-06 w-uni-07 w-uni-08 w-uni-09 w-uni-10 w-ush-01 w-ush-02 w-ush-03 w-ush-04 w-ush-05 w-ush-06 w-ush-07 w-ush-08 w-ush-09 w-ush-10 x-bic-08 x-cc-01 x-cc-02 x-cc-03 x-cc-04 x-cc-05 x-cc-06 x-cc-07 x-cc-08 x-cc-09 x-cc-10 x-ccl-02 x-ccl-04 x-ccl-06 x-ccl-08 x-ccl-10 x-cco-01 x-cco-02 x-cco-03 x-cco-04 x-cco-05 x-cco-06 x-cco-07 x-cco-08 x-cco-09 x-cco-10 x-ccr-02 x-ccr-04 x-ccr-06 x-ccr-08 x-ccr-10 x-ccs-07 x-ccs-08 x-ccs-09 x-ccs-10 x-pmr-03 x-pmr-05 x-pmr-08 x-pmr-10 x-sbr-01 x-sbr-02 x-sbr-03 x-sbr-04 x-sbr-05 x-sbr-06 x-sbr-07 x-sbr-08 x-sbr-09 x-sbr-10 x-sen-03 x-sen-05 x-sen-10 x-sth-01 x-sth-02 x-sth-03 x-sth-04 x-sth-05 x-sth-06 x-sth-07 x-sth-08 x-sth-10 x-uni-04 x-uni-06 x-uni-07 x-uni-08 x-uni-09 x-uni-10 x-ush-03 x-ush-05 x-ush-07 x-ush-08 x-ush-09 x-ush-10 y-bic-01 y-bic-02 y-bic-03 y-bic-04 y-bic-05 y-bic-06 y-bic-07 y-bic-08 y-bic-09 y-bic-10 y-sen-01 y-sen-02 y-sen-03 y-sen-04 y-sen-05 y-sen-06 y-sth-01 y-sth-02 y-sth-03 y-sth-04 y-sth-05 y-sth-06 y-uni-01 y-uni-02 y-uni-03 y-uni-04 y-uni-05 y-uni-06 y-ush-01 y-ush-02 y-ush-03 y-ush-04 y-ush-05 y-ush-06 z-cc-01 z-cc-02 z-cc-03 z-cc-04 z-cc-05 z-cc-06 z-ccl-01 z-ccl-02 z-ccl-03 z-ccl-04 z-ccl-05 z-ccl-06 z-cco-01 z-cco-02 z-cco-03 z-cco-04 z-cco-05 z-cco-06 z-ccr-01 z-ccr-03 z-ccr-04 z-ccs-01 z-ccs-02 z-ccs-04 z-ccs-05 z-ccs-06 z-pmr-01 z-pmr-02 z-pmr-03 z-pmr-04 z-pmr-05 z-pmr-06 z-sbr-01 z-sbr-02 z-sbr-03 z-sbr-04 z-sbr-05 z-sbr-06

## Independent masks, October 14, 2026

New `<version>.persons/` folders use torchvision Mask R-CNN ResNet-50 FPN V2, COCO V1 weights, with person score at least 0.8 and mask probability at least 0.5. Each folder records its source hash and tool in `provenance.json`. These masks do not read the empty painting or old masks. All original JPEGs and masks are preserved.

The school board room has been rebuilt and visually reviewed: seven chairs, 27 people, four accepted native image-generation replacements. Generated sources retain their prompts and alpha masks. Rejected cut-outs and reasons are in its source `rejected/` directory. The seven chair anchors and desk outline were marked once from the empty painting. `review.json` records whole cut-outs rejected during sheet review; no rejected pixels were repaired.
