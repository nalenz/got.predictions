#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../common"))
from utils import *



def cumulArrayElements(arr):
  return [sum(arr[:i]) for i,_ in enumerate(arr)]

if len(sys.argv) < 2:
  sys.stderr.write("error: no dataset specified\n")
  sys.exit(1)

if sys.argv[1] == "book":
  attrs = [
    { 'name': 'male', 'dims': 1 },
    { 'name': 'pageRank', 'dims': 1 },
    { 'name': 'numRelatives', 'dims': 1 },
    { 'name': 'age', 'dims': 100 },
    { 'name': 'allegiances', 'dims': 396 },
    { 'name': 'books', 'dims': 19 },
    { 'name': 'culture', 'dims': 56 },
    { 'name': 'house', 'dims': 360 },
    { 'name': 'houseRegion', 'dims': 29 },
    { 'name': 'locations', 'dims': 193 },
    { 'name': 'titles', 'dims': 515 }
  ]
  chars = readBookMLDataFile("chars-to-train") + readBookMLDataFile("chars-to-predict")
  dataInput = np.append(readFormattedBinaryBookMLFile("v2-data-train"), readFormattedBinaryBookMLFile("v2-data-predict"), axis=0)
elif sys.argv[1] == "show":
  attrs = [
    { 'name': 'male', 'dims': 1 },
    { 'name': 'isBastard', 'dims': 1 },
    { 'name': 'pageRank', 'dims': 1 },
    { 'name': 'numRelatives', 'dims': 1 },
    { 'name': 'numCommandedBattles', 'dims': 1 },
    { 'name': 'age', 'dims': 86 },
    { 'name': 'allegiances', 'dims': 130 },
    { 'name': 'appearances', 'dims': 74 },
    #{ 'name': 'cultures', 'dims': 0 },
    { 'name': 'titles', 'dims': 122 }
  ]
  chars = readShowMLDataFile("chars-to-train") + readShowMLDataFile("chars-to-predict")
  dataInput = np.append(readFormattedBinaryShowMLFile("v1-data-train"), readFormattedBinaryShowMLFile("v1-data-predict"), axis=0)
else:
  sys.stderr.write("error: unknown dataset: " + sys.argv[1] + "\n")
  sys.exit(1)

charNames = [x["name"] for x in chars]
data = np.split(dataInput, cumulArrayElements([x["dims"] for x in attrs])[1:], axis=1)


NUM_MOST_SIMILAR = 10

res = {}
resOnlyMin = {}
for charIdx in range(len(chars)):
  allDists = np.empty([len(attrs), len(charNames)])
  for attrIdx in range(len(attrs)):
    dists = np.linalg.norm(data[attrIdx] - data[attrIdx][charIdx], axis=1)
    allDists[attrIdx] = dists     # / max(dists)
  avgs = np.average(allDists, axis=0)
  avgsMod = 1.0 - avgs / max(avgs)
  avgs[charIdx] = float("inf")
  currRes = dict(zip(charNames, avgsMod))
  currRes["_min"] = [charNames[i] for i in np.argsort(avgs)[:NUM_MOST_SIMILAR]]
  del currRes[charNames[charIdx]]
  res[charNames[charIdx]] = currRes
  resOnlyMin[charNames[charIdx]] = currRes["_min"]
writeJSON(sys.argv[1] + "-char-distances-weighted", res, True)
writeJSON(sys.argv[1] + "-char-distances-weighted-onlymin", resOnlyMin, True)

res = {}
resOnlyMin = {}
for charIdx in range(len(chars)):
  dists = np.linalg.norm(dataInput - dataInput[charIdx], axis=1)
  currRes = dict(zip(charNames, (1.0 - dists / max(dists)).tolist()))
  currRes["_min"] = [charNames[i] for i in np.argsort(dists)[1:NUM_MOST_SIMILAR + 1]]
  del currRes[charNames[charIdx]]
  res[charNames[charIdx]] = currRes
  resOnlyMin[charNames[charIdx]] = currRes["_min"]
writeJSON(sys.argv[1] + "-char-distances-simple", res, True)
writeJSON(sys.argv[1] + "-char-distances-simple-onlymin", resOnlyMin, True)
