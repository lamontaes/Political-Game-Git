---
id: party-groups-and-your-representative-read-right
impact: patch
section: Fixed
title: New party groups get real names, and a split city no longer shows the wrong House member
---

When members broke away from a local party chapter and founded their own group,
the game named the group by pasting the position they disagreed over after
"League for". Players in Clarksdale read "League for follow the wider party
line decided: Local positions", and a Detroit life saw "Proposal to form League
for keep a clear distance." Each position now carries a written group name,
such as the Party Unity League or the Independence League. Groups already
founded in an existing save keep the name they were given.

The opening scenes showed a San Antonio life the U.S. Representative for
Texas's 1st district, which is in East Texas. The scene took the first House
seat in the home state. It now names a House member only when the state has a
single seat, so that member is certainly the player's. San Antonio is split
across several districts, so its lives see their two Senators and no
Representative until the game can place a home in one district.

The Windows packaging check was also red on every pull request, because a test
of the macOS-only update helper called a program by its macOS path. That test
now skips on other platforms and says why.
