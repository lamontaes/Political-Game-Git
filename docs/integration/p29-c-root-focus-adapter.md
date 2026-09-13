# P29-C root focus adapter (for A)

C owns conversation, person-menu, and scene-content layout. PlayerGame is the
shared root. This is the only root wiring A needs to retain.

Head this was written against: branch `cursor/p29-c-talk-focus-layout-a942`.

## Mount

In `src/player/PlayerGame.tsx`:

1. `InvokerFocusReturn` inside the play `main`, with
   `personId={conversation ? null : returnFocusTo}` and `onDone` clearing that
   id. Conversation Back still sets `returnFocusTo` to the addressee. Do not
   replace this with `setTimeout` or a synthetic click.
2. `PersonSceneActionMenu` for the room action menu (same test ids as before).
   It focuses the first enabled item and positions beside the still-mounted
   `scene-person-*` token, clamped to the viewport.
3. Conversation remaining local React state, not a shell surface, so Calendar /
   News / People browse-and-return can keep the pending line. Escape on a
   workspace still pops the workspace; `SceneConversation` only handles Escape
   when `.pg-workspace` is not open.

No other PlayerGame callbacks are required. Shell `escape` order is unchanged.

## Out of this adapter

- `SceneConversation` focus-on-open and document Escape when not browsing
- `SceneBackdrop` bottom-centre conversation dock / safe max-height
- Wardrobe preview CSS and family labels (see `p29-c-wardrobe-layout-handoff.md`)
