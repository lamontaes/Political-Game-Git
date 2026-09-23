---
id: a-pin-pressed-while-a-page-closes-stays-open
impact: patch
section: Fixed
title: A page opened while another is closing stays open
---

Closing a page, such as People, fades it out before the room returns. A pin
pressed during that fade opened the person's page, and then the old close
went through a moment later and shut the new page. The page now stays open,
and Back from it returns to the page underneath. Three browser tests that
were failing on main now pass: the People web test at both widths, the
docket test, and the calendar test, which failed about two runs in three.
