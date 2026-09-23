---
id: press-check-without-rescans
impact: patch
section: Fixed
title: A week press on a long save takes about a quarter less time.
---

At the end of every press, the game checks the whole saved world. Three parts of that check compared each record with every other record of its kind: each paid or missed wage against every earlier one, each news source against every press record, and each death against every event. About 110 other places found an event by going through every event of the life. They now use an index. On Parker Brooks's 84 MB Woonsocket save, a week press went from about 3.4 seconds to 2.4 in Node, and the world it produced was byte-for-byte the same.
