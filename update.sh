#!/bin/bash

TIME_RUN=$(python <<END
from datetime import datetime
today = datetime.today()
print str(int((datetime(today.year, today.month, today.day, 0, 0) - datetime(1970,1,1)).total_seconds()))
END)

cd "$( dirname "${BASH_SOURCE[0]}" )"

mkdir -p public/data

echo "time,frame" > public/data/frames.csv

for FRAME in {0..72}
do
    echo "\n Generating frame $((FRAME))"

	TIME_FRAME=$(( TIME_RUN + FRAME*3600 ))

	# VARS="wind10m_u,wind10m_v,topo,rain,temp2m,press[0],lat,lon"
	# VARS="wind10m_u,wind10m_v,temp2m,wind_u,wind_v,temp"
	VARS="wind10m_u,wind10m_v,temp2m"
	wget "http://dap.ometfn.net/eu12-pp_$(date +%Y%m%d00)_${FRAME}.nc.nc?$VARS" -O data_tmp.nc \
		&& python nc-to-img.py $FRAME \
		&& echo "${TIME_FRAME},${FRAME}" >> public/data/frames.csv \

done

echo "Update ran successfully at $(date)"