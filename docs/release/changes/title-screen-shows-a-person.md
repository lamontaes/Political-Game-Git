---
id: title-screen-shows-a-person
impact: minor
section: Changed
title: Somebody is standing at the lectern on the title screen
---

The title screen has been able to draw a figure at the lectern for some time.
The room, the lectern and the light were all there, and the component that
draws them accepts a person to stand behind it. Nothing ever handed it one, so
every player who opened the game saw an empty room.

The title screen now resolves a figure from the most recent save and draws
them at the lectern. A player with no saves sees the room as before, because
there is nobody to draw and drawing a stranger would be worse than drawing
no one. The candidate art preview modes pick up whatever library they are
pointed at, so a preview build shows the candidate figure and a production
build shows only released art.

Nothing on this screen spends time and nothing here creates a fact: it is the
menu, and it stays a picture.
