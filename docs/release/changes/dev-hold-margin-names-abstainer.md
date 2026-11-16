---
id: dev-hold-margin-names-abstainer
impact: patch
section: Fixed
title: Dev mode's Hold the vote holds the exact margin, and says who abstained
---

Dev mode's Hold the vote now holds the exact margin you ask for. A chamber with an even number of voting members can't split yes and no by an odd margin, and an odd-sized one can't split them by an even margin. Examples are a House with one seat vacant and the Senate. In that case one member abstains, and the dev card names who and why, for example "434 voting members, one seat vacant".
