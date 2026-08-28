# Visual Acceptance

- green unit/E2E tests do not prove visual quality;
- fresh live-browser human inspection is required for player-facing visual surfaces;
- screenshots must be native/lossless enough to judge;
- visible semantic controls require real pointer-click plus keyboard activation;
- automated geometry tests cannot override an obvious visible failure;
- seating/contact/occlusion must read physically plausibly to a human;
- aspect ratio and common scene transform must be preserved;
- do not intentionally blur sharp assets to match a blurry environment;
- when source resolution is insufficient, state that and calculate required replacement dimensions;
- never repeatedly upscale/resample the same source and call that new detail.
