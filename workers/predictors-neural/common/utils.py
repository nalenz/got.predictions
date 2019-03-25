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



def readMLDataFile(worker, name):
  with open(os.path.join(dirname, "../../" + worker + "/output/ml-data/" + name + ".json"), "r") as f:
    return json.load(f)

def readBookMLDataFile(name):
  return readMLDataFile("formatter", name)

def readShowMLDataFile(name):
  return readMLDataFile("formatter-show", name)



def readFormattedBinaryMLByteArray(f):
  num, = struct.unpack("<i", f[0:4])
  len, = struct.unpack("<i", f[4:8])
  return np.reshape(np.frombuffer(f[8:], dtype=np.float32), [num, len])

def readFormattedBinaryMLFile(worker, name):
  filename = os.path.join(dirname, "../../" + worker + "/output/" + name + ".dat")
  if os.path.isfile(filename):
    with open(filename, "rb") as f:
      return readFormattedBinaryMLByteArray(f.read())
  else:
    with open(filename + ".gz", "rb") as f:
      return readFormattedBinaryMLByteArray(zlib.decompress(f.read()))

def readFormattedBinaryBookMLFile(name):
  return readFormattedBinaryMLFile("formatter-neural", name)

def readFormattedBinaryShowMLFile(name):
  return readFormattedBinaryMLFile("formatter-neural-show", name)



def writeJSON(name, obj, pretty=False):
  with open(os.path.join(dirnameMain, "output/" + name + ".json"), "w") as f:
    json.dump(obj, f, indent=4 if pretty else None)
