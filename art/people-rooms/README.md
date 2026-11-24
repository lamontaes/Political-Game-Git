# People in rooms: measured spots

`art/people-rooms/spots/<scene>.json` holds a room's measured spots, in pixels of the empty painting at its own size: head top, middle and width, pose, facing, the front line of any furniture in front, and the shared tags (`dress`, `role`, `seat`, `check`). `scripts/people/room-spots.ts` reads them and writes the spots into `art/backdrops/staging.json` and the occluder masks in `art/backdrops/occluders`. Nothing else opens this folder.

`art/people-rooms/mannequin-plates/` holds the position records the game loads (`<scene>.mannequins.json`); see its README.

The green mannequin pictures, their tools, tags, prompts and manifests were deleted at the owner's word (Nov 3, "Delete that mannequin"; Nov 5): seats are blobs, positions only. The room-spots skill says how a room is measured.
