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
charsTrain = readShowMLDataFile("chars-to-train")
charsPredict = readShowMLDataFile("chars-to-predict")
dataPredict = readFormattedBinaryShowMLFile("v1-data-predict")
dataTrain = readFormattedBinaryShowMLFile("v1-data-train")
labelsTrain = readFormattedBinaryShowMLFile("v1-labels-train")



if False:
  # build the model
  model = Sequential()
  model.add(Dense(500, activation='relu'))
  model.add(Dropout(0.7))
  model.add(Dense(250, activation='relu'))
  model.add(Dropout(0.7))
  model.add(Dense(100, activation='relu'))
  model.add(Dropout(0.7))
  model.add(Dense(1, activation='sigmoid'))
  model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

  # train the model
  model.fit(dataTrain, labelsTrain, epochs=50, batch_size=32)
  model.save(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))

else:
  # predict ages for other characters
  model = load_model(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))
  predictionsPLOD = np.array(np.array_split(model.predict(dataPredict).flatten(), len(charsPredict))).tolist()
  writeJSON("predictions", dict(zip(map(lambda x: x["name"], charsPredict), predictionsPLOD)), True)
