#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import keras
import numpy as np
from keras.models import Sequential, load_model
from keras.layers import Activation, Dropout, Flatten, Dense

from utils import *



# data and label attributes
dataAttrs = ["books", "house", "locations", "titles"]
labelAttrs = ["age"]

# read character training data
charsTrain = readMLDataFile("chars-to-train")
charsPredict = readMLDataFile("chars-to-predict")
attrRanges = extendAttrRanges(extremeAttrArray(charsTrain, dataAttrs + labelAttrs), extremeAttrArray(charsPredict, dataAttrs + labelAttrs))
numAges = attrRanges[labelAttrs[0]][1] - attrRanges[labelAttrs[0]][0] + 1

# determine individual offsets in input data for each attribute
offsetsData = {"male": 0, "pageRank": 1, "books": 2}
for curr, prev in zip(dataAttrs[1:], dataAttrs[:-1]):
  offsetsData[curr] = offsetsData[prev] + (attrRanges[prev][1] - attrRanges[prev][0] + 1)
dataLength = offsetsData[dataAttrs[-1]] + (attrRanges[dataAttrs[-1]][1] - attrRanges[dataAttrs[-1]][0] + 1)
print(dataLength)

# create final data
data = []
for c in charsTrain:
  curr = np.zeros(dataLength)
  curr[offsetsData["male"]] = 1 if c["male"] else 0
  curr[offsetsData["pageRank"]] = c["pageRank"]
  for d in dataAttrs:
    for x in (c[d] if isinstance(c[d], list) else [c[d]]):
      curr[offsetsData[d] + (x - attrRanges[d][0])] = 1
  data.append(curr)
data = np.array(data)

# create final labels
labels = []
for c in charsTrain:
  curr = np.zeros(numAges)
  curr[c["age"] - attrRanges[labelAttrs[0]][0]] = 1
  labels.append(curr)
labels = np.array(labels)



# build the model
model = Sequential()
model.add(Dense(250, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(numAges, activation='sigmoid'))
model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

# train the model
model.fit(data, labels, epochs=50, batch_size=16)
model.save('got-predictor-model.h5')
