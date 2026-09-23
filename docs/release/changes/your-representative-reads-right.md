---
id: your-representative-reads-right
impact: patch
section: Fixed
title: A split city no longer shows the wrong House member
---

The opening scenes showed a San Antonio life the U.S. Representative for
Texas's 1st district, which is in East Texas. The scene took the first House
seat in the home state. It now names a House member only when the state has a
single seat, so that member is certainly the player's. San Antonio is split
across several districts, so its lives see their two Senators and no
Representative until the game can place a home in one district.

The Windows packaging check was also red on every pull request, because a test
of the macOS-only update helper called a program by its macOS path. That test
now skips on other platforms and says why.
