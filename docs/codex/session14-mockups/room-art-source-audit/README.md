# Small-town window sources remain placeholders

Three existing rooms show rural or detached-house scenery rather than city blocks. Session3 can use their exact source identities for review staging. None establishes Brianna’s recorded room or final art approval. The open menu also needs a smaller-screen layout repair; its closed player card fits all three measured viewports.

## Existing source identities

[assets.json](assets.json) records the asset IDs, original filenames, manifest source hashes and computed JPEG hashes from main. All 25 variants across six residential room families have the approval label `owner-placeholder-2026-09-27`. Their JPEG hashes match the manifest. The named original PNGs were not found in the searched art, shared or library-file banks; source PNG hashes are manifest claims rather than newly verified original bytes.

Visual inspection found trees and lawn in `mobile-home__morning.jpg`, fields and a barn in `rural-farmhouse__morning.jpg`, and trees, fence and a detached neighboring roof in `suburban-house__morning.jpg`. The city-block window in `small-apartment__morning.jpg` remains excluded from this requested staging. These are generic sources, not invented Scarville geography.

The actual room must follow the recorded dwelling classification through `homePlaceForPerson` in [place-backdrops.ts](../../../../src/presentation/place-backdrops.ts). A town name alone does not establish a farmhouse or mobile home. No art or game records changed.

## Measured rendering limits

[responsive-fit.json](responsive-fit.json) records both states at 1920×1080, 1366×768 and 1024×768. The closed card has no checked clipping or overflow at any size. The open menu fits 1920×1080; at both smaller sizes its person-details panel and four fan items cross the viewport. Date/time and controls remain inside the player card, and radial corner marks remain absent.

The source images are 1672×941. The existing native-1920 browser stage uses CSS cover at approximately 1.148 scale; no raster file was enlarged. That display is not an art-fidelity approval. Source-native viewing or non-enlarging contain is the appropriate fidelity check.

Session3 still needs the recorded dwelling projection before choosing an actual room. Owner selection and live full-shell proof remain pending. This packet supplies existing source evidence and measured limits; it does not select or approve a menu.
