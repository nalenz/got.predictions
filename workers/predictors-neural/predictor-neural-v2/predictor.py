#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import keras
import numpy as np
from keras.models import Sequential, load_model
from keras.layers import Activation, Dropout, Flatten, Dense

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../common"))
from utils import *
from config import *



# data and label attributes
dataAttrs = ["age", "books", "house", "locations", "titles"]

# read character data
charsTrain = readMLDataFile("chars-to-train")
charsPredict = readMLDataFile("chars-to-predict")
attrRanges = extremeAttrArray(charsTrain + charsPredict, dataAttrs)
numAges = attrRanges["age"][1] - attrRanges["age"][0] + 1

# determine individual offsets in input data for each attribute
offsetsData = {"male": 0, "pageRank": 1, "age": 2}
for curr, prev in zip(dataAttrs[1:], dataAttrs[:-1]):
  offsetsData[curr] = offsetsData[prev] + (attrRanges[prev][1] - attrRanges[prev][0] + 1)
dataLength = offsetsData[dataAttrs[-1]] + (attrRanges[dataAttrs[-1]][1] - attrRanges[dataAttrs[-1]][0] + 1)



# create final data and labels for training
data, labels = [], []
for c in charsTrain:
  currMain = np.zeros(dataLength)
  currMain[offsetsData["male"]] = 1 if c["male"] else 0
  currMain[offsetsData["pageRank"]] = c["pageRank"]
  for d in dataAttrs:
    for x in (c[d] if isinstance(c[d], list) else [c[d]]):
      currMain[offsetsData[d] + (x - attrRanges[d][0])] = 1
  
  # insert one data point for each age
  for a in range(numAges):
    curr = np.copy(currMain)
    curr[a + 2] = 1
    data.append(curr)
    labels.append([0.0 if c["age"] < a else 1.0])

# convert data and labels for training to numpy arrays
data = np.array(data)
labels = np.array(labels)



# create data and labels for predictions
dataPredict = []
for c in charsPredict:
  currMain = np.zeros(dataLength)
  currMain[offsetsData["male"]] = 1 if c["male"] else 0
  currMain[offsetsData["pageRank"]] = c["pageRank"]
  for d in dataAttrs:
    for x in (c[d] if isinstance(c[d], list) else [c[d]]):
      currMain[offsetsData[d] + (x - attrRanges[d][0])] = 1

  # insert one vector for each year to predict
  for y in range(300, 310):
    curr = np.copy(currMain)
    curr[y - c["dateOfBirth"] + 2] = 1.0     # use age corresponding to current year
    dataPredict.append(curr)
  
# convert data for predictions into numpy array
dataPredict = np.array(dataPredict)



if False:
  # build the model
  model = Sequential()
  model.add(Dense(250, activation='relu'))
  model.add(Dropout(0.5))
  model.add(Dense(100, activation='relu'))
  model.add(Dropout(0.5))
  model.add(Dense(1, activation='sigmoid'))
  model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

  # train the model
  model.fit(data, labels, epochs=50, batch_size=32)
  model.save(os.path.join(dirname, 'models/got-predictor-model.h5'))

else:
  # predict ages for other characters
  model = load_model(os.path.join(dirname, 'models/got-predictor-model.h5'))
  predictionsPLOD = np.array(np.array_split(model.predict(dataPredict).flatten(), len(charsPredict))).tolist()
  writeJSON("predictions", dict(zip(map(lambda x: x["name"], charsPredict), predictionsPLOD)))
