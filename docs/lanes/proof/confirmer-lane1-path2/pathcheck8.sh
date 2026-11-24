#!/bin/bash
# Lane 1 path 2: path-check (headless golden path, the player stands up to three races) in the eight fixed towns, one at a time.
cd /home/user/Political-Game-Git
export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192
O=/tmp/claude-0/-home-user-Political-Game-Git/39df252c-0e86-5c04-a0d3-e3e72f11d951/scratchpad/l1p2
mkdir -p $O; echo "main $(git log --oneline -1)" > $O/commit.txt
for row in "haleyville 0132704 ab5f58e9be125c95" "murray 3133425 1d3f0e18ca4ba7e5" "meadow-lakes 0247735 f835dd278d7312a1" "brookside 1009850 4d50e1f88df997f9" "storrs 0973980 storrs-1" "dc 1150000 dc-closures-a" "cabo-rojo 7209861 f857db7436bf7449" "santa-rita territory:GU:santa-rita 6f539fcfdf6d96f9-5"; do set -- $row
  SECONDS=0; GOLDEN_PATH_SEED=$3 GOLDEN_PATH_PLACE_KEY=$2 node --max-old-space-size=8192 --import tsx src/bench/path-check.ts > $O/$1.out 2> $O/$1.err; echo "$? $SECONDS" > $O/$1.done
done
