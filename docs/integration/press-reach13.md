# PRESS-REACH13 UI-core contract

No `PlayerGame` or global navigation change is required. UI #144 already mounts
`PressWorkspace`. This branch updates that existing consumer:

- public civic developments, not only published digest items, are request bases;
- `seekCivicPressContact` is offered when no journalism role exists, and
  generates a new authored civic reporter rather than reassigning someone
  already in the life;
- arrangement proceeds after reporter acceptance without a compulsory adviser.

LAND/A should keep the existing `PressWorkspace` mount. Do not add a second
press panel or publisher.
