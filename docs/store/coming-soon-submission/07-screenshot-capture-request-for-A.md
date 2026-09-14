# Screenshot capture request for A

Valve: at least five gameplay screenshots, 1920×1080 minimum, 16:9. Gameplay only. No concept art, no awards, no marketing text, no watermarks, no developer review hub, no `?art-preview=candidate` unless the owner explicitly wants candidate people on the public page (production Steam builds refuse that flag).

This session **cannot** open the identified Play. Do not substitute public main `f22fd314` or any other port.

## Required identity on every file

Record in the filename sidecar or a one-line `manifest.txt` next to the PNGs:

- Git SHA: `2b8237a19dd1eceaa43ba96eb186327e0b224349`
- Branch: `codex/playtest34-a-next` (board)
- URL: `http://127.0.0.1:5275/` **without** `art-preview=candidate` for store shots
- Footer / About identity agreeing with that SHA
- Capture date, OS, browser or desktop shell, viewport 1920×1080 (or native 16:9 ≥1080p cropped to 16:9 without stretching)
- “No watermark, no overlay chrome from the OS except the game”

If that SHA is no longer the serving Play, **stop** and recapture from the current identified combined candidate; do not mix BF9/5254/5264/5273/5274 historical profiles.

## Five required shots

Save under `docs/store/coming-soon-submission/screenshots/` with these exact names.

### 1. `ocd_ss_01_quiet_home.png`

Ordinary resting home scene after Begin. No mandatory intro cards. Room visible. Unobtrusive controls only. Full-body contact with floor if a person is present. **Do not** manufacture a second visible player avatar.

### 2. `ocd_ss_02_conversation.png`

Bottom-centre conversation with a known person. If the relationship is parent, the label should read as Mom/Dad (or the actual relation), not a bare surname. One spoken line. Scene still visible. This is gameplay UI, which Valve allows.

### 3. `ocd_ss_03_people.png`

People list or search using the same portraits as the scene. No debug IDs.

### 4. `ocd_ss_04_calendar.png`

Calendar with real dates, not a tooling dump. Prefer a view that is player-facing. If Local Government still reads like internal tooling, **do not** use that frame for Steam.

### 5. `ocd_ss_05_creator_or_title.png`

Either the title room with the Our Civic Duty wordmark (this is the unique front door; Valve allows a menu shot when it is a unique component) **or** the creator “Where are you from?” step showing alphabetical town results after a non-Kentucky state, with no Lexington priority.

## Optional sixth (do not substitute for a missing required)

`ocd_ss_06_legislation.png` — only if the identified build shows a **player** legislative surface for a sitting that is actually supported. Do not photograph developer legislation workspace chrome.

## Forbidden frames

- Candidate-art URL
- Developer Review Hub
- Native update permission dialogs
- Terminal, VS Code, Drive, or board text
- Concept plates without the running UI
- Cropping out UI to look like key art (capsules already cover key art)
- Any frame with a watermark or “DRAFT” stamp; do not paint them out

## Delivery

Drop the five PNGs plus `manifest.txt` into `screenshots/` and tell STORE the SHA that actually served. STORE will not invent replacements.
