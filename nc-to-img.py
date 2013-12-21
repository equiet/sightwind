#!/usr/bin/env python

import netCDF4 as nc
import png
import struct
import sys
from numpy import *

width=495
height=309
nvals=width*height

data = nc.Dataset('data_tmp.nc', 'r')

params = ['wind10m_u', 'wind10m_v', 'temp2m']

for var in params:

  f = open('public/data/data-' + var + '_' + sys.argv[1] + '.png', 'wb')

  w = png.Writer(width=width, height=height, alpha=True, compression=9)

  bitmap = list()

  data_array = list(data.variables[var])

  for y in range(height - 1, -1, -1):
    for x in range(width):
      bytes = struct.pack('<f', data_array[y][x])
      colors = struct.unpack('4B', bytes)
      bitmap.append(colors[0])
      bitmap.append(colors[1])
      bitmap.append(colors[2])
      bitmap.append(colors[3])

  w.write_array(f, bitmap)

  f.close()

data.close()
