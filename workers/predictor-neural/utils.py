import os
import json
import math



# some global constants
dirname = os.path.dirname(__file__)



# find maximum attribute value in list of dicts
def accAttr(arr, attr, fn, alt):
  return fn(map(lambda x: x[attr] if not isinstance(x[attr], list) else (alt if len(x[attr])==0 else fn(x[attr])), arr))

def minAttr(arr, attr):
  return accAttr(arr, attr, min, math.inf)

def maxAttr(arr, attr):
  return accAttr(arr, attr, max, -math.inf)

def extremeAttr(arr, attr):
  return [minAttr(arr, attr), maxAttr(arr, attr)]

def extremeAttrArray(arr, attrs):
  return dict(zip(attrs, map(lambda x: extremeAttr(arr, x), attrs)))

def extendAttrRanges(a, b):
  for k, v in b.items():
    if k in a:
      a[k] = [min(a[k][0], v[0]), max(a[k][1], v[1])] if k in a else v
  return a

def readMLDataFile(name):
  with open(os.path.join(dirname, "../formatter/output/ml-data/" + name + ".json"), "r") as f:
    return json.load(f)

def writeJSON(name, obj):
  with open(os.path.join(dirname, "output/" + name + ".json"), "w") as f:
    json.dump(obj, f)
