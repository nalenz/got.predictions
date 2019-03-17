import os
import json
import math
import struct
import numpy as np
import __main__



# some global constants
dirname = os.path.dirname(__file__)
dirnameMain = os.path.dirname(__main__.__file__)



def readMLDataFile(name):
  with open(os.path.join(dirname, "../../formatter/output/ml-data/" + name + ".json"), "r") as f:
    return json.load(f)
  
def readFormattedBinaryMLFile(name):
  with open(os.path.join(dirname, "../../formatter-neural/output/" + name + ".dat"), "rb") as f:
    num, = struct.unpack("<i", f.read(4))
    len, = struct.unpack("<i", f.read(4))
    return np.reshape(np.fromfile(f, dtype=np.float32), [num, len])

def writeJSON(name, obj):
  with open(os.path.join(dirnameMain, "output/" + name + ".json"), "w") as f:
    json.dump(obj, f)
