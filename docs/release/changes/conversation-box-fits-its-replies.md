---
id: conversation-box-fits-its-replies
impact: patch
section: Fixed
title: The conversation box shows every reply without a scrollbar, and says what you just said
---

When you talk to someone in a room, the conversation box is now sized from
its own replies instead of a fixed guess. It stands bottom-center when nobody
is behind it, docks beside the person you are facing when someone is, and
keeps clear of faces. It grows wider before it grows taller, and in a wide box
the replies sit in columns. At 1200 by 720, 1280 by 720 and 1440 by 900 every
reply is on screen with no scrollbar inside the box.

While you are talking in the room, the morning note and the recap step aside
and come back, still unread, when the conversation ends.

In a quiet room at home, the box now shows what you just said above the
answer. Before, it showed only the answer, because it looked for the turn in
an opening scene that a quiet room does not have.
