# Asset bank inventory

Status: **generated — do not hand-edit**

Regenerate with `npm run inventory:asset-bank`. Every number below is read
from the asset manifest, the character catalog, the pose registry and the
cargo disposition ledger, so this file cannot drift from the library it
describes; a focused test regenerates it and fails on a mismatch.

## Environments usable now

| Asset                                                          | Family                  | Path                                                                                                    |
| -------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| env_civic_hearing_room_5504x3072_v1                            | civic-hearing-room      | art/families/civic-hearing-room/env_civic_hearing_room_runtime_2x_v1.png                                |
| env_lexington_council_staff_office_prompt30_foreground_mask_v1 | council-staff-office    | art/families/council-staff-office/env_lexington_council_staff_office_prompt30_foreground_mask_2x_v1.png |
| env_lexington_council_staff_office_prompt30_v1                 | council-staff-office    | art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png         |
| env_residence_apartment_living_canonical_03_5504x3072_v1       | apartment-ordinary      | art/families/apartment-ordinary/env_residence_apartment_living_canonical_03_v1.png                      |
| env_residence_apartment_living_ordinary_02_5504x3072_v1        | apartment-ordinary      | art/families/apartment-ordinary/env_residence_apartment_living_ordinary_02_v1.png                       |
| env_shared_workroom_office_v1                                  | shared-workroom-office  | art/families/shared-workroom-office/env_shared_workroom_office_runtime_2x_v1.png                        |
| title_bg_civic_community_meeting_hero_slot_5504x3072_v1        | civic-community-meeting | art/families/civic-community-meeting/title_bg_civic_community_meeting_hero_slot_runtime_2048_v1.png     |

Registered environment families: `apartment-ordinary`, `civic-community-meeting`, `civic-hearing-room`, `council-staff-office`, `executive-private-office`, `shared-workroom-office`.

A family with no released plate is an authoring target, not coverage. 7 further environment candidates are DECLARED and awaiting bytes in `art/intake/environment-batch-2026-09-03.request.json`; none of them counts as coverage until intake measures the real file.

## Modular character components usable now

| Kind       | Released |
| ---------- | -------- |
| accessory  | 2        |
| body       | 14       |
| bottom     | 4        |
| eyewear    | 2        |
| footwear   | 3        |
| hair-back  | 2        |
| hair-front | 5        |
| head       | 6        |
| top        | 8        |

Released body families: `dev-adult`, `dev-g2-broad`, `dev-g2-slim`.

Every released component is a **DEV / NON-PRODUCTION fixture**: 46 fixture rows against 0 production rows. No production character art is released.

## Source masters held

| Master                                    | Class    | Runtime released |
| ----------------------------------------- | -------- | ---------------- |
| pg_master_body_standing_frame_a           | bodies   | no               |
| pg_master_body_standing_frame_b           | bodies   | no               |
| pg_master_bottom_01_straight_leg_jeans    | bottoms  | no               |
| pg_master_bottom_02_dress_trousers        | bottoms  | no               |
| pg_master_bottom_03_a_line_knee_skirt     | bottoms  | no               |
| pg_master_footwear_01_low_top_sneakers    | footwear | no               |
| pg_master_footwear_02_leather_loafers     | footwear | no               |
| pg_master_footwear_03_low_practical_flats | footwear | no               |
| pg_master_hair_01_short_tapered_afro      | hair     | no               |
| pg_master_hair_02_rounded_medium_afro     | hair     | no               |
| pg_master_hair_03_shoulder_natural_curls  | hair     | no               |
| pg_master_hair_04_high_puff               | hair     | no               |
| pg_master_hair_05_shoulder_box_braids     | hair     | no               |
| pg_master_hair_06_long_box_braids         | hair     | no               |
| pg_master_hair_07_cornrows_low_bun        | hair     | no               |
| pg_master_hair_08_shoulder_locs           | hair     | no               |
| pg_master_head_01_bald_neutral            | heads    | no               |
| pg_master_head_02_bald_neutral            | heads    | no               |
| pg_master_head_03_bald_neutral            | heads    | no               |
| pg_master_head_04_bald_neutral            | heads    | no               |
| pg_master_head_05_bald_neutral            | heads    | no               |
| pg_master_top_01_short_sleeve_crew_tee    | tops     | no               |
| pg_master_top_02_long_sleeve_button_shirt | tops     | no               |
| pg_master_top_03_pullover_sweater         | tops     | no               |
| pg_master_top_04_structured_blazer        | tops     | no               |

## P0 pose coverage by compatibility group

| Pose family                | Priority | Posture           | Status              | Covered body families                | Still missing             |
| -------------------------- | -------- | ----------------- | ------------------- | ------------------------------------ | ------------------------- |
| seated-at-desk             | P0       | seated            | development-fixture | dev-adult, dev-g2-broad, dev-g2-slim | —                         |
| seated-guest-neutral       | P0       | seated            | pending-generation  | —                                    | dev-g2-broad, dev-g2-slim |
| standing-conversational    | P0       | standing          | pending-generation  | —                                    | dev-g2-broad, dev-g2-slim |
| standing-listening         | P1       | standing          | pending-generation  | —                                    | dev-g2-broad, dev-g2-slim |
| standing-neutral           | P0       | standing          | development-fixture | dev-adult, dev-g2-broad, dev-g2-slim | —                         |
| standing-podium-or-lectern | P1       | podium-or-lectern | pending-generation  | —                                    | dev-g2-broad, dev-g2-slim |

## Generation queue

What still needs making, ordered so anything a live scene anchor already asks
for comes first.

| Pose family                | Priority | Blocks           | Consuming anchors                                                                                                                                                                                                                                                                                                            | Missing for               | Control plate                                                 | Master minimum |
| -------------------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- | -------------- |
| seated-guest-neutral       | P0       | current-gameplay | office-council-staff-fixture:left-guest-chair, residence-apartment-living-canonical-03:club-chair-seated, residence-apartment-living-canonical-03:sofa-seated, residence-apartment-living-ordinary-02:armchair-seated, residence-apartment-living-ordinary-02:sofa-seated, shared-workroom-office-production:left-task-chair | dev-g2-broad, dev-g2-slim | art/pose-control-plates/seated-guest-neutral__front.svg       | 1530x2048      |
| standing-conversational    | P0       | current-gameplay | residence-apartment-living-canonical-03:living-room-floor-standing, residence-apartment-living-ordinary-02:living-room-floor-standing, shared-workroom-office-production:kitchenette-standing, shared-workroom-office-production:workroom-floor-standing                                                                     | dev-g2-broad, dev-g2-slim | art/pose-control-plates/standing-conversational__front.svg    | 1696x2528      |
| standing-listening         | P1       | current-gameplay | civic-community-meeting-title:stage-left-standing, civic-hearing-room-production:hearing-floor-standing, residence-apartment-living-canonical-03:entry-side-standing, residence-apartment-living-ordinary-02:entry-side-standing, shared-workroom-office-production:near-table-standing                                      | dev-g2-broad, dev-g2-slim | art/pose-control-plates/standing-listening__front.svg         | 1696x2528      |
| standing-podium-or-lectern | P1       | current-gameplay | civic-community-meeting-title:podium-speaker, civic-hearing-room-production:witness-lectern-standing                                                                                                                                                                                                                         | dev-g2-broad, dev-g2-slim | art/pose-control-plates/standing-podium-or-lectern__front.svg | 1696x2528      |

## Cargo disposition

- re-homed: `pr48-body-masters`, `pr48-bottom-masters`, `pr48-footwear-masters`, `pr48-hair-front-masters`, `pr48-head-masters`, `pr48-intake-mechanics`, `pr48-top-masters`, `pr48-upstream-pack-manifests`, `pr63-pr74-architecture`, `pr80-authoring-contracts`, `pr80-modular-in-scene`, `pr80-office-occluder-repair`, `pr80-pg-modular-candidates`, `pr80-production-authoring-records`
- rejected: `pack-office-cubicle-set`, `pr48-demographic-asset-ids`, `pr48-normalized-derivatives`, `pr48-stale-architecture`, `pr80-safe-area-doc`, `pr80-scene-composition`
- archived: `pack-universal-animation-library`, `pack-universal-base-characters`
- pending verification: —

Reasons and evidence for each are in `art/manifest/cargo_disposition.json`.
No externally downloaded pack is counted as coverage anywhere in this report.
