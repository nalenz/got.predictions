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
dataPredict = readFormattedBinaryBookMLFile("v1-data-predict")
dataTrain = readFormattedBinaryBookMLFile("v1-data-train")
labelsTrain = readFormattedBinaryBookMLFile("v1-labels-train")



if False:
  # build the model
  model = Sequential()
  model.add(Dense(250, activation='relu'))
  model.add(Dropout(0.5))
  model.add(Dense(100, activation='relu'))
  model.add(Dropout(0.5))
  model.add(Dense(labelsTrain.shape[1], activation='sigmoid'))
  model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

  # train the model
  model.fit(dataTrain, labelsTrain, epochs=200, batch_size=16)
  model.save(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))

else:
  # predict ages for other characters
  model = load_model(os.path.join(dirnameMain, 'models/got-predictor-model.h5'))
  predictionsAge = np.argmax(model.predict(dataPredict), 1)

  predictionsRelativeToCurrent = list(map(lambda x: int(x[0]["birth"] + x[1] - GOT_CURRENT_YEAR_BOOK), list(zip(charsPredict, predictionsAge))))
  writeJSON("predictions", dict(zip(map(lambda x: x["name"], charsPredict), predictionsRelativeToCurrent)))
