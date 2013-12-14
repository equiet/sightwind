#!/bin/bash

RUN=$(curl http://api.omd.li/runs/last)

RUN_DAY=${RUN:0:8}
RUN_HOUR=${RUN:8:2}

TIME_NOW=$(date -u +%s)
TIME_RUN=$(date --date="$RUN_DAY $RUN_HOUR UTC" +%s)

DELTA=$(( TIME_NOW - TIME_RUN ))
FRAME=$(( DELTA / 3600 ))
REMAIN=$(( DELTA % 3600 ))

if [ "$REMAIN" -ge "1800" ]; then
  FRAME=$(( FRAME+1 ))
fi

TIME_FRAME=$(( TIME_RUN + FRAME*3600 ))

VARS="wind10m_u,wind10m_v,topo,rain,temp2m,press[0],lat,lon"
wget "http://dap.ometfn.net/eu12-pp_${RUN}_${FRAME}.nc.nc?$VARS" -O data.nc \
&& python nc-to-img.py \
&& echo "update_time($TIME_FRAME);" > last.js