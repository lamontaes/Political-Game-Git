# Graphical assets — filenames and specifications

Official sizes from [Graphical Assets Overview](https://partner.steamgames.com/doc/store/assets) and [Store Graphical Assets](https://partner.steamgames.com/doc/store/assets/standard), retrieved 2026-09-14.

Rules ([Graphical Asset Rules](https://partner.steamgames.com/doc/store/assets/rules)):

- Base capsules: game artwork + readable product name/logo + official subtitle only
- No awards, quotes, review scores, discount copy
- PG-13 artwork on capsules
- Screenshots: genuine gameplay only, ≥1920×1080, 16:9; no concept art, cinematic stills, or marketing copy
- Library hero: **no text**

## What this finish pass added

`capsules/titled/` composites the in-game wordmark **Our Civic Duty** (TitleScreen `.front-door-wordmark`, ivory on the front-door serif stack) onto the existing authorized Lanczos downscales. No new scene generation, no watermark removal, no invented logo mark.

Linux has no Palatino; the compositor uses Liberation Serif Bold, the installed Times New Roman stand-in named in `src/player/front-door.css`. D34-05’s rejected in-game badge is not this store title.

Library hero is the existing untitled downscale (no title, no duplicate bytes).

Reproduce:

```sh
python3 docs/store/coming-soon-submission/scripts/composite-wordmark-capsules.py
```

Requires system Liberation Serif and Python Pillow.

## Steamworks upload files

| Steamworks slot  | Size                     | Upload file                                                                                                    | Source                                                      |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Header capsule   | 920×430                  | `capsules/titled/ocd_header_capsule_920x430.png`                                                               | Community-meeting master + wordmark                         |
| Small capsule    | 462×174                  | `capsules/titled/ocd_small_capsule_462x174.png`                                                                | Same; stacked title                                         |
| Main capsule     | 1232×706                 | `capsules/titled/ocd_main_capsule_1232x706.png`                                                                | Civic hearing room + wordmark                               |
| Vertical capsule | 748×896                  | `capsules/titled/ocd_vertical_capsule_748x896.png`                                                             | Hearing room + stacked title                                |
| Library capsule  | 600×900                  | `capsules/titled/ocd_library_capsule_600x900.png`                                                              | Hearing room + stacked title                                |
| Library header   | 920×430                  | `capsules/titled/ocd_library_header_920x430.png`                                                               | Shared workroom + wordmark                                  |
| Library hero     | 3840×1240 PNG, no text   | `capsules/artwork-only/library_hero_3840x1240_artwork_only.png` (upload name `ocd_library_hero_3840x1240.png`) | Community meeting crop, untitled                            |
| Library logo     | 1280×720 transparent PNG | `capsules/titled/ocd_library_logo_1280x720.png`                                                                | Wordmark only                                               |
| Shortcut icon    | 256×256 PNG              | `capsules/titled/ocd_shortcut_icon_256x256.png`                                                                | Header crop + stacked title                                 |
| Client app icon  | 184×184 JPG              | `capsules/titled/ocd_app_icon_184x184.jpg`                                                                     | Same crop                                                   |
| Page background  | 1438×810                 | `capsules/titled/ocd_page_background_1438x810.png`                                                             | Apartment living + wordmark                                 |
| Screenshots ×5   | ≥1920×1080 16:9          | `screenshots/ocd_ss_*.png`                                                                                     | **Receive from compiled33** — see `07-gameplay-captures.md` |

Do **not** use `OCD_CANDIDATE_SCENE_GENERIC_LEGISLATIVE_CHAMBER_FLOOR_*` for store capsules. Do not enlarge rasters. Artwork-only downscales remain in `capsules/artwork-only/` as the untitled sources. Hashes: `capsules/titled/hashes.json`.

## Uncertain permissions

AI-origin environment plates used here carry `rights_license_status: unknown` in `art/manifest/provenance.json`. That is an exact provenance question for the owner, not a blanket rights-cleared verdict. See `04-ai-content-disclosure.md`.

## Bundle header (707×232)

Skip unless a bundle is created.
