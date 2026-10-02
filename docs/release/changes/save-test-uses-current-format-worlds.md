---
id: save-test-uses-current-format-worlds
impact: none
---

The save-store tests distinguish fresh pinned saves from unpinned appearance saves. The migration case uses valid current world records with the legacy missing-pin shape, verifies that reading does not change the stored payload, and checks that each life keeps its migrated pin after saving and reopening. Historical fixture files and production migration remain unchanged. Full historical-payload compatibility is separate from this appearance-only proof.
