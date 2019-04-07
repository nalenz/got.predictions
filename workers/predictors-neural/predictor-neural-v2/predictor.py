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



# read character training and prediction data
charsTrain = readBookMLDataFile("chars-to-train")
charsPredict = readBookMLDataFile("chars-to-predict")
dataPredict = readFormattedBinaryBookMLFile("v2-data-predict")
dataTrain = readFormattedBinaryBookMLFile("v2-data-train")
labelsTrain = readFormattedBinaryBookMLFile("v2-labels-train")



if False:
  # build the model
  model = Sequential()
  model.add(Dense(500, activation='relu'))
  model.add(Dropout(0.8))
  model.add(Dense(250, activation='relu'))
  model.add(Dropout(0.8))
  model.add(Dense(100, activation='relu'))
  model.add(Dropout(0.8))
  model.add(Dense(1, activation='sigmoid'))
  model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

  # train the model
  model.fit(dataTrain, labelsTrain, epochs=5, batch_size=32, validation_split=0.2)
  model.save(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))

else:
  # predict ages for other characters
  model = load_model(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))
  predictionsPLOD = np.array(np.array_split(model.predict(dataPredict).flatten(), len(charsPredict))).tolist()
  predictionsDict = dict(zip(map(lambda x: x["name"], charsPredict), predictionsPLOD))
  writeJSON("predictions", predictionsDict, True)
  for k, v in predictionsDict.items():
    predictionsDict[k] = 1.0 - v[0]
  writeJSON("predictions-plod", predictionsDict, True)
