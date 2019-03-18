import os
import json
import math
import struct
import zlib
import io
import numpy as np
import __main__



# some global constants
dirname = os.path.dirname(__file__)
dirnameMain = os.path.dirname(__main__.__file__)



def readMLDataFile(name):
  with open(os.path.join(dirname, "../../formatter/output/ml-data/" + name + ".json"), "r") as f:
    return json.load(f)

def readFormattedBinaryMLByteArray(f):
  num, = struct.unpack("<i", f[0:4])
  len, = struct.unpack("<i", f[4:8])
  return np.reshape(np.frombuffer(f[8:], dtype=np.float32), [num, len])

def readFormattedBinaryMLFile(name):
  filename = os.path.join(dirname, "../../formatter-neural/output/" + name + ".dat")
  if os.path.isfile(filename):
    with open(filename, "rb") as f:
      return readFormattedBinaryMLByteArray(f.read())
  else:
    with open(filename + ".gz", "rb") as f:
      return readFormattedBinaryMLByteArray(zlib.decompress(f.read()))

def writeJSON(name, obj):
  with open(os.path.join(dirnameMain, "output/" + name + ".json"), "w") as f:
    json.dump(obj, f)
