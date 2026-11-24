#!/bin/bash
cd /home/user/Political-Game-Git
export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192
O=/tmp/claude-0/-home-user-Political-Game-Git/39df252c-0e86-5c04-a0d3-e3e72f11d951/scratchpad/l5p3
echo "main $(git log --oneline -1)" > $O/commit.txt
run() { SECONDS=0; npm run speed:year -- "$@" --years 4 --max-seconds 100000 > $O/$tag.out 2> $O/$tag.err; echo "$? $SECONDS" > $O/$tag.done; }
tag=drawn; run --seed confirmer-speed-1
for row in "haleyville 0132704 ab5f58e9be125c95" "murray 3133425 1d3f0e18ca4ba7e5" "meadow-lakes 0247735 f835dd278d7312a1" "brookside 1009850 4d50e1f88df997f9" "storrs 0973980 storrs-1" "dc 1150000 dc-closures-a" "cabo-rojo 7209861 f857db7436bf7449" "santa-rita territory:GU:santa-rita 6f539fcfdf6d96f9-5"; do set -- $row; tag=$1; run --seed $3 --place $2; done
