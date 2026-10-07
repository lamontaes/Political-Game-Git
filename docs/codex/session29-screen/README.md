# PR #2452 screen comparison

Both images are full-screen Chromium captures from a new game in South Burlington, Vermont (`5066175`), using seed `session23-part6-one-inbox-new-game-2026-10-06`.

- `main-executive-work.png` was captured on current main `e4c2be3cd`.
- `branch-executive-inbox.png` was captured on the refreshed PR branch `b91a5b048`.

Both previews use the same authored mayor seat in the generated life. The setup is a controlled display preview, not a natural election result. The main capture shows the separate office and governing tabs; the branch capture shows the unified inbox with recorded agenda and budget matters.

The Playwright runner used system Chromium and a temporary local Node JSON import attribute to accommodate the current environment; no visual/runtime application code was changed for capture.
