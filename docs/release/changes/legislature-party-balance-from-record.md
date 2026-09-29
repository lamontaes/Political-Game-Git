---
id: legislature-party-balance-from-record
impact: patch
section: Changed
title: A state legislature opens with the state's recorded party balance
---

Before, each seat in the home state's legislature took its party from the
seat's generated lean, so a chamber could open with the wrong majority.
A Pennsylvania world opened with Republicans holding the House 113 to 90 and
Democrats holding the Senate 27 to 23.

Now each chamber holds the party balance the state recorded (The Book of the
States 2023, Table 3.3): the seats leaning furthest toward each party take
that party's count, so Pennsylvania opens with Democrats holding the House
102 to 101 and Republicans holding the Senate 28 to 22. The members are
still generated people. Seats the record gives to neither party keep their
own lean, and Nebraska's nonpartisan legislature is unchanged.
