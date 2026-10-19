#!/bin/bash
# build_place.sh PLACE CODE OUTNAME [old-folder]: strict build from old crowd versions + the very sparse x- versions.
cd "$(dirname "$0")"
P=$1; C=$2; O=$3; OLD=${4:-seats/$P}
case $P in us-house-floor|us-senate-floor|state-*) export MAX_HEAD_Y=0.72;; *) export MAX_HEAD_Y=0.86;; esac
args=""
if [ "$OLD" != "none" ]; then for v in 1 2 3 4 5 6; do [ -f $OLD/v$v.png ] && args="$args $OLD/v$v.png:$OLD/m$v.png"; done; fi
for pre in ${PREFIXES:-x}; do for f in seatfill/xs/$pre-$C-*.png; do [ -f "$f" ] || continue; k=$(basename $f .png); [ -s seatfill/xs/m-$k.png ] && args="$args $f:seatfill/xs/m-$k.png"; done; done
rm -rf seats/$O; mkdir -p seats/$O
STRICT=1 python3 build_seats.py $P backdrops/${P}__midday.jpg seats/$O/out $args 2>&1 | tail -2
