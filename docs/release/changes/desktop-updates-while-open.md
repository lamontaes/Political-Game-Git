---
id: desktop-updates-while-open
impact: patch
section: Fixed
title: Keep the private game current while its hub stays open
---

The private hub now checks the selected game and main for new builds while it
remains open. When a verified update is ready, it installs automatically only
at the game's own title screen; an open life keeps its existing build.
An unchanged GitHub revision returns after a remote-head check, without
fetching or rebuilding the same game again.

Preparing a code update no longer verifies the same artwork snapshot twice
before publication. The full artwork check still runs before the new build is
offered, and the hub checks it again before switching. The hub also shows the
short build revision beside the release number, so a code update is visible
even when the release number remains the same.

Desktop release checks now inspect the saved database at its current schema
version instead of attempting to reopen it as an older version. The package
build gives the TypeScript check a 4 GiB heap on hosted runners.
