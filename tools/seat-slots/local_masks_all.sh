#!/bin/bash
cd "$(dirname "$0")"
place() { case $1 in sen) echo us-senate-floor;; ush) echo us-house-floor;; sth) echo state-house-chamber;; bic) echo state-legislative-chamber-bicameral;; uni) echo state-legislative-chamber-unicameral;; cc) echo council-chamber;; ccl) echo council-chamber-large;; ccs) echo council-chamber-small;; cco) echo county-commission;; ccr) echo county-commission-rural;; pmr) echo public-meeting-room;; sbr) echo school-board-room;; esac; }
for f in seatfill/xs/[xyzw]-*.png; do
  k=$(basename $f .png); [ -s seatfill/xs/m-$k.png ] && continue
  echo "$k $(place $(echo $k | cut -d- -f2))"
done | xargs -P 4 -n 2 sh -c 'python3 local_mask.py backdrops/$1__midday.jpg seatfill/xs/$0.png seatfill/xs/m-$0.png && echo done $0'
echo ALLMASKS
