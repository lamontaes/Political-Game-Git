# Graphical assets — filenames and specifications

Official sizes from [Graphical Assets Overview](https://partner.steamgames.com/doc/store/assets) and [Store Graphical Assets](https://partner.steamgames.com/doc/store/assets/standard), retrieved 2026-09-14 (August 2024 larger capsules; old smaller dimensions are not accepted).

Rules ([Graphical Asset Rules](https://partner.steamgames.com/doc/store/assets/rules)):

- Base capsules: game artwork + readable product name/logo + official subtitle only
- No awards, quotes, review scores, discount copy
- PG-13 artwork on capsules
- Screenshots: genuine gameplay only, ≥1920×1080, 16:9; no concept art, cinematic stills, or marketing copy

## Disposition of files in this packet

`capsules/artwork-only/` contains **Lanczos downscales** of owner-authorized scene masters already in the repository. No new pixels were invented, no watermarks removed, no title drawn. **They are not Steamworks-upload-ready** until a readable “Our Civic Duty” wordmark is composited by an authorized art owner.

D34-05 rejected a small lower-left badge as polished final UI. Capsule wordmark is a **separate store-branding decision** (see `08-missing-owner-decisions.md`).

Library hero must contain **no text**; that file can be uploaded after owner visual OK without a wordmark.

## Steamworks target filenames (upload names)

Use these names in Steamworks. Keep the `artwork_only` files as sources.

| Steamworks slot | Size | Upload filename | Working file now | Source master (sha256 prefix) |
| --- | --- | --- | --- | --- |
| Header capsule | 920×430 | `ocd_header_capsule_920x430.png` | `header_capsule_920x430_artwork_only.png` | `PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png` `0ac5ef6ffa603d95…` crop `5504×2572` at `0,250` |
| Small capsule | 462×174 | `ocd_small_capsule_462x174.png` | `small_capsule_462x174_artwork_only.png` | same community meeting; crop `5504×2076` at `0,498`. **Wordmark must nearly fill this crop** |
| Main capsule | 1232×706 | `ocd_main_capsule_1232x706.png` | `main_capsule_1232x706_artwork_only.png` | `OCD_SCENE_MASTER_CIVIC_HEARING_ROOM_5504x3072_01.jpg` `c2021c87a073e7fd…` crop `5360×3072` at `72,0` |
| Vertical capsule | 748×896 | `ocd_vertical_capsule_748x896.png` | `vertical_capsule_748x896_artwork_only.png` | hearing room crop `2560×3072` at `1472,0` |
| Library capsule | 600×900 | `ocd_library_capsule_600x900.png` | `library_capsule_600x900_artwork_only.png` | hearing room crop `2048×3072` at `1728,0` |
| Library header | 920×430 | `ocd_library_header_920x430.png` | `library_header_920x430_artwork_only.png` | `OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg` crop `5504×2572` at `0,250` |
| Library hero | 3840×1240 PNG, **no text** | `ocd_library_hero_3840x1240.png` | `library_hero_3840x1240_artwork_only.png` | community meeting crop `5504×1777` at `0,647`. Safe area 860×380 centered in the Steam template |
| Library logo | 1280 wide and/or 720 tall, transparent PNG, **wordmark only** | `ocd_library_logo_1280.png` | **missing** | Cannot be produced without a title treatment. Request in `08` |
| Shortcut icon | 256×256 PNG or ICO | `ocd_shortcut_icon_256x256.png` | **missing** | Same |
| Client app icon | 184×184 JPG | `ocd_app_icon_184x184.jpg` | **missing** | Same |
| Page background (optional) | 1438×810 | `ocd_page_background_1438x810.png` | `page_background_1438x810_artwork_only.png` | `OCD_SCENE_MASTER_APARTMENT_LIVING_CANONICAL_03_5504x3072.jpg` crop `5454×3072` at `25,0` |
| Screenshots (required ×5) | ≥1920×1080 16:9 | `ocd_ss_01_home.png` … `ocd_ss_05_people.png` | **missing** | Capture from identified Play only — `07-screenshot-capture-request-for-A.md` |

Do **not** use `OCD_CANDIDATE_SCENE_GENERIC_LEGISLATIVE_CHAMBER_FLOOR_*` for store capsules (candidate, not production). Do not use pose-control SVGs or QA overlays. Do not enlarge any raster; every working file is a downscale.

## Reproduce the working files

From the repository root, with `ffmpeg`:

```sh
# Header
ffmpeg -y -i art/references/masters/scene-environment/PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png \
  -vf "crop=5504:2572:0:250,scale=920:430:flags=lanczos" -frames:v 1 -update 1 \
  docs/store/coming-soon-submission/capsules/artwork-only/header_capsule_920x430_artwork_only.png
```

Other filters match the table. SHA-256 of current working files: `capsules/artwork-only/hashes.json`.

## Bundle header (707×232)

Not required unless a bundle is created. Skip.
