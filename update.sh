#!/bin/bash

RUN=$(curl http://api.omd.li/runs/last)

TIME_NOW=$(python <<END
import time
from datetime import datetime
print str(int(time.mktime(datetime.now().timetuple())))
END)
TIME_RUN=$(python <<END
import time
from datetime import datetime
last_run = datetime.strptime("${RUN}", "%Y%m%d%H")
print str(int(time.mktime(last_run.timetuple())))
END)

DELTA=$(( TIME_NOW - TIME_RUN ))
FRAME=$(( DELTA / 3600 ))
REMAIN=$(( DELTA % 3600 ))

if [ "$REMAIN" -ge "1800" ]; then
  FRAME=$(( FRAME+1 ))
fi

TIME_FRAME=$(( TIME_RUN + FRAME*3600 ))

cd "$( dirname "${BASH_SOURCE[0]}" )"

VARS="wind10m_u,wind10m_v,topo,rain,temp2m,press[0],lat,lon"
wget "http://dap.ometfn.net/eu12-pp_${RUN}_${FRAME}.nc.nc?$VARS" -O data.nc \
&& python nc-to-img.py \
&& echo "update_time($TIME_FRAME);" > public/data/last.js \
&& echo "Update ran successfully: $(date)"
