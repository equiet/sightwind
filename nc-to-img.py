#!/usr/bin/env python

import netCDF4 as nc
import png
import struct
import sys
import os
import inspect
from numpy import *

width=495
height=309
levels=39
nvals=width*height

frame = sys.argv[1]

data = nc.Dataset('data_tmp.nc', 'r')



### Ground level data

params = ['wind10m_u', 'wind10m_v', 'temp2m']

for var in params:

  if var not in data.variables:
    continue

  if not os.path.exists('public/data/' + frame):
    os.makedirs('public/data/' + frame)

  f = open('public/data/' + frame + '/' + var + '.png', 'wb')

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



### Elevation data


for level in range(0, levels):

  params = ['wind_u', 'wind_v', 'temp']

  for var in params:

    if var not in data.variables:
      continue

    if not os.path.exists('public/data/' + frame):
      os.makedirs('public/data/' + frame)

    f = open('public/data/' + frame + '/' + var + '_' + str(level) + '.png', 'wb')

    w = png.Writer(width=width, height=height, alpha=True, compression=9)

    bitmap = list()

    data_array = list(data.variables[var])

    for y in range(height - 1, -1, -1):
      for x in range(width):
        bytes = struct.pack('<f', data_array[level][y][x])
        colors = struct.unpack('4B', bytes)
        bitmap.append(colors[0])
        bitmap.append(colors[1])
        bitmap.append(colors[2])
        bitmap.append(colors[3])

    w.write_array(f, bitmap)

    f.close()



data.close()
