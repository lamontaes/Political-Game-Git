#!/bin/bash
for v in before after; do
  cd /home/user/wt-$v
  mkdir -p /home/user/prof/cpu-$v
  s=$(date +%s)
  node --cpu-prof --cpu-prof-dir=/home/user/prof/cpu-$v --max-old-space-size=8192 --import tsx src/core2/tooling/drives-proof.ts --timing-only base --days 31 > /home/user/prof/$v-prof.out 2> /home/user/prof/$v-prof.err
  echo "$v prof exit=$? wall=$(( $(date +%s)-s ))s" >> /home/user/prof/prof.log
done
# first-day cost (script option --days 1; no code change)
for v in before after; do
  cd /home/user/wt-$v
  node --max-old-space-size=8192 --import tsx src/core2/tooling/drives-proof.ts --timing-only base --days 1 > /home/user/prof/$v-d1.out 2> /home/user/prof/$v-d1.err
  echo "$v d1 exit=$?" >> /home/user/prof/prof.log
done
echo ALLDONE >> /home/user/prof/prof.log
