---
id: recovery25-private-mac
impact: none
---

The current transfer proof compares every v3 interface field without slot IDs,
reopens both slots, and exercises future-schema refusal. The Saved games adapter
now shows refusal errors and labels exported review lives with their actual
profile; ordinary production still refuses review imports. This is private,
unreleased desktop continuity, not a version-number change or public release.

Adds an unsigned Apple Silicon internal-art-review delivery that bundles a
verified initial game and keeps the last known-good version available while a
new accepted-main build is fetched, compiled, packaged, launched, and checked.
This is private development delivery only; it does not configure or claim a
public signed update channel and does not change released simulation behavior.

Controller success proof additionally reproduced inherited Electron Node-worker
mode preventing the candidate health-check from opening a GUI. The launch
environment now strips that worker-only flag for the actual game, retaining
the isolated profile and review label; failure still leaves the current pointer.
