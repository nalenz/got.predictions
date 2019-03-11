#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
#import keras
#import numpy as np
#from keras.models import Sequential, load_model
#from keras.layers import Activation, Dropout, Flatten, Dense

from utils import *



# read character training data
charsTrain = readMLDataFile("chars-to-train")
charsPredict = readMLDataFile("chars-to-predict")
rangedAttrs = ["age", "books", "house", "locations", "titles"]
attrRanges = extendAttrRanges(extremeAttrArray(charsTrain, rangedAttrs), extremeAttrArray(charsPredict, rangedAttrs));
print(attrRanges)
sys.exit(0)



# build the model
model = Sequential()
model.add(Dense(250, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(100, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(1, activation='sigmoid'))
model.compile(optimizer='rmsprop', loss='binary_crossentropy', metrics=['accuracy'])

# train the model
model.fit(data, labels, epochs=50, batch_size=16)
model.save('got-predictor-model.h5')
