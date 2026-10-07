---
id: ow16-card-closes-with-moment
impact: patch
section: Fixed
title: A person's card no longer stays open after the day moves on
---

Before, a person's card opened in a room stayed on screen after you passed
the day. The person had left the room and the clock showed another morning,
but the card still sat over the new scene.

Now the card closes whenever the scene or the world's clock moves on, so it
never follows you into a moment its person was not part of. Opening a card
and then going to any screen from the menu already closed it; this covers
the time controls, which did not.
