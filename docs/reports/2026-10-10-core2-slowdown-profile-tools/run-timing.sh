#!/bin/bash
# one process at a time: warmup, then 2 measured, BEFORE then AFTER each
cd /home/user/prof
for phase in warm m1 m2; do
 for v in before after; do
  cd /home/user/wt-$v
  s=$(date +%s)
  node --max-old-space-size=8192 --import tsx src/core2/tooling/drives-proof.ts --timing-only base --days 31 > /home/user/prof/$v-$phase.out 2> /home/user/prof/$v-$phase.err
  echo "$v $phase exit=$? wall=$(( $(date +%s)-s ))s" >> /home/user/prof/timing.log
 done
done
echo ALLDONE >> /home/user/prof/timing.log
