#!/usr/bin/env python

import netCDF4 as nc
import png
import struct
from numpy import *

width=495
height=309
nvals=width*height

data = nc.Dataset('data.nc', 'r')

params = list(['wind10m_u', 'wind10m_v', 'topo', 'temp2m','rain','press','lat','lon'])

for var in params:
  f = open('data-'+var+'.png', 'wb')

  w = png.Writer(width=width, height=height, alpha=True, compression=9)

  bitmap=list()
  
  if var=='press':
    data_array=list(data.variables[var][0])
  else:
    data_array=list(data.variables[var])

  for y in range(height):
    for x in range(width):
      bytes=struct.pack('<f', data_array[y][x])
      colors=struct.unpack('4B', bytes)
      bitmap.append(colors[0])
      bitmap.append(colors[1])
      bitmap.append(colors[2])
      bitmap.append(colors[3])

  w.write_array(f, bitmap)

  f.close()

data.close()
