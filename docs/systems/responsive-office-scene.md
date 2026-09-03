# Responsive Office Virtual Scene

## Boundary

The office uses one presentation-only virtual scene of **1024 × 572 scene
units**, matching the approved Prompt 30 aspect ratio. The environment plate,
foreground furniture mask, character art, pelvis/contact roots, semantic person
hitboxes, briefing memorandum, civic marker, and working-document entry are
children of one transformed scene root.

Navigation, time/location, Next Commitment, user pins, person menus, dossiers,
conversation, Calendar, Work/Pending, and document workspaces remain responsive
viewport-space UI. The scene transform never enters World or simulation
history.

## Camera contract

resolveSceneTransform() is the sole transform calculation. It receives the
viewport, virtual-scene dimensions, camera policy, and current device-pixel
ratio, then returns one uniform scale and one X/Y offset. The rendered scene
uses translate3d(xOffset, yOffset, 0) scale(uniformScale).

scaleX and scaleY are always identical. Ordinary desktop ratios use
aspect-preserving cover. The camera is centered horizontally and biased 75%
toward the lower contact plane when vertical crop is required.

The camera aperture is bounded to aspect ratios from **3:2 through 12:5**.
Viewports wider than 12:5 retain a centered 12:5 camera and use pillar space for
the excess width. This prevents 32:9 displays from stretching the room or
cropping away required interaction content.

## Safe areas

- Guaranteed scene-safe rectangle: x 86–936, y 112–533.
- Essential-content rectangle: x 185–935, y 165–525 (widened 2026-09-01 when the A01/B01 roots moved to their measured seat lines).
- Lower viewport UI recovery zone: 620 × 120 CSS px from bottom-left.
- Navigation flyout recovery zone: 320 × 300 CSS px from top-left.

The essential rectangle contains both complete character rasters and their
roots/hitboxes plus every scene-document anchor. The automated matrix proves
that it remains inside the visible virtual-scene rectangle.

## Automated viewport and DPR matrix

Every row below passes the pure transform invariant suite. The same 13 viewport
rows also pass live Chromium geometry and interaction proof. DPR 1, 1.25, and 2
pass live Chromium alignment proof at representative logical viewports.

Effective coverage compares the approved source master with the required
physical-pixel footprint. The deterministic 2048 × 1144 Prompt 30 derivative
does not increase effective source coverage because Lanczos resampling creates
no new detail.

| CSS viewport |  DPR |    Scale | Prompt 30 required (coverage) | A01 required (coverage) | B01 required (coverage) |
| ------------ | ---: | -------: | ----------------------------: | ----------------------: | ----------------------: |
| 1280×720     |    1 | 1.258741 |              1289×720 (79.4%) |        325×435 (235.5%) |        261×350 (293.2%) |
| 1280×720     | 1.25 | 1.258741 |              1612×900 (63.6%) |        407×544 (188.4%) |        327×437 (234.6%) |
| 1280×720     |    2 | 1.258741 |             2578×1440 (39.7%) |        650×870 (117.8%) |        522×699 (146.6%) |
| 1366×768     |    1 | 1.342657 |              1375×768 (74.5%) |        347×464 (220.8%) |        279×373 (274.9%) |
| 1366×768     | 1.25 | 1.342657 |              1719×960 (59.6%) |        434×580 (176.6%) |        348×466 (219.9%) |
| 1366×768     |    2 | 1.342657 |             2750×1536 (37.2%) |        693×928 (110.4%) |        557×745 (137.5%) |
| 1440×900     |    1 | 1.573427 |              1612×900 (63.6%) |        407×544 (188.4%) |        327×437 (234.6%) |
| 1440×900     | 1.25 | 1.573427 |             2014×1125 (50.8%) |        508×680 (150.7%) |        408×546 (187.7%) |
| 1440×900     |    2 | 1.573427 |             3223×1800 (31.8%) |        813×1087 (94.2%) |        653×874 (117.3%) |
| 1920×1080    |    1 | 1.888112 |             1934×1080 (53.0%) |        488×653 (157.0%) |        392×524 (195.5%) |
| 1920×1080    | 1.25 | 1.888112 |             2417×1350 (42.4%) |        610×816 (125.6%) |        490×655 (156.4%) |
| 1920×1080    |    2 | 1.888112 |             3867×2160 (26.5%) |        975×1305 (78.5%) |        783×1048 (97.7%) |
| 1920×1200    |    1 | 2.097902 |             2149×1200 (47.7%) |        542×725 (141.3%) |        435×583 (175.9%) |
| 1920×1200    | 1.25 | 2.097902 |             2686×1500 (38.1%) |        677×906 (113.0%) |        544×728 (140.8%) |
| 1920×1200    |    2 | 2.097902 |             4297×2400 (23.8%) |       1083×1450 (70.7%) |        870×1165 (88.0%) |
| 2560×1440    |    1 | 2.517483 |             2578×1440 (39.7%) |        650×870 (117.8%) |        522×699 (146.6%) |
| 2560×1440    | 1.25 | 2.517483 |             3223×1800 (31.8%) |        813×1087 (94.2%) |        653×874 (117.3%) |
| 2560×1440    |    2 | 2.517483 |             5156×2880 (19.9%) |       1300×1740 (58.9%) |       1044×1397 (73.3%) |
| 2560×1600    |    1 | 2.797203 |             2865×1600 (35.8%) |        722×967 (106.0%) |        580×777 (132.0%) |
| 2560×1600    | 1.25 | 2.797203 |             3581×2000 (28.6%) |        903×1208 (84.8%) |        725×971 (105.6%) |
| 2560×1600    |    2 | 2.797203 |             5729×3200 (17.9%) |       1444×1933 (53.0%) |       1160×1553 (66.0%) |
| 2560×1080    |    1 | 2.500000 |             2560×1430 (40.0%) |        646×864 (118.6%) |        519×694 (147.6%) |
| 2560×1080    | 1.25 | 2.500000 |             3200×1788 (32.0%) |        807×1080 (94.9%) |        648×867 (118.1%) |
| 2560×1080    |    2 | 2.500000 |             5120×2860 (20.0%) |       1291×1728 (59.3%) |       1037×1388 (73.8%) |
| 3440×1440    |    1 | 3.359375 |             3440×1922 (29.8%) |        867×1161 (88.2%) |        697×932 (109.9%) |
| 3440×1440    | 1.25 | 3.359375 |             4300×2402 (23.8%) |       1084×1451 (70.6%) |        871×1165 (87.9%) |
| 3440×1440    |    2 | 3.359375 |             6880×3844 (14.9%) |       1734×2321 (44.1%) |       1393×1864 (54.9%) |
| 3840×1600    |    1 | 3.750000 |             3840×2145 (26.7%) |        968×1296 (79.1%) |        778×1041 (98.4%) |
| 3840×1600    | 1.25 | 3.750000 |             4800×2682 (21.3%) |       1210×1620 (63.2%) |        972×1301 (78.7%) |
| 3840×1600    |    2 | 3.750000 |             7680×4290 (13.3%) |       1936×2591 (39.5%) |       1555×2081 (49.2%) |
| 3840×2160    |    1 | 3.776224 |             3867×2160 (26.5%) |        975×1305 (78.5%) |        783×1048 (97.7%) |
| 3840×2160    | 1.25 | 3.776224 |             4834×2700 (21.2%) |       1219×1631 (62.8%) |        979×1310 (78.2%) |
| 3840×2160    |    2 | 3.776224 |             7734×4320 (13.2%) |       1949×2609 (39.3%) |       1566×2096 (48.9%) |
| 5120×1440    |    1 | 3.375000 |             3456×1931 (29.6%) |        871×1166 (87.8%) |        700×937 (109.4%) |
| 5120×1440    | 1.25 | 3.375000 |             4320×2414 (23.7%) |       1089×1458 (70.3%) |        875×1171 (87.5%) |
| 5120×1440    |    2 | 3.375000 |             6912×3861 (14.8%) |       1742×2332 (43.9%) |       1399×1873 (54.7%) |
| 7680×2160    |    1 | 5.062500 |             5184×2896 (19.8%) |       1307×1749 (58.6%) |       1050×1405 (72.9%) |
| 7680×2160    | 1.25 | 5.062500 |             6480×3620 (15.8%) |       1633×2186 (46.8%) |       1312×1756 (58.3%) |
| 7680×2160    |    2 | 5.062500 |             10368×5792 (9.9%) |       2613×3498 (29.3%) |       2099×2809 (36.5%) |

## Raster-fidelity disposition and project art authority

The responsive transform is geometrically correct across all tested viewports
and device pixel ratios.

In the development test suite, the historical 1024×572 Prompt 30 master and
historical A01/B01 sprites are used as test fixtures to verify camera math and
occlusion layering. Coverage measurements against those historical fixtures
demonstrate why higher-resolution source assets are needed for Retina displays.

Project art authority is now established externally:

- **Environment**: `PG-E02 CLEAN` is the human-approved current office
  composition master (5568×3008 source PNG), providing full resolution
  sufficient for a later non-enlarging crop to 4096×2288. The office does not
  need another regeneration or upscale.
- **Characters**: Historical B01 is retired as the final guest-chair asset.
  New primary and guest character assets in production externally (e.g. Firefly)
  will be integrated in a subsequent asset-substitution pass.
