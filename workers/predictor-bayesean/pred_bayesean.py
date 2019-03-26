from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import pymc3 as pm
from pymc3.distributions.timeseries import GaussianRandomWalk
from theano import tensor as T
import random
import json

#read input file
df = pd.read_json(path_or_buf = "../formatter-bayesean/ref_chs.json", typ = "frame")

#get some parameters
num_characters = df.shape[0]
characters = np.arange(num_characters) #vector 1....num_characters

#set parameters
interval_length = 1 #discretization over interval_length-year intervals
interval_bounds = np.arange (0, df.age.max() + interval_length + 1, interval_length) #vector describing the boundaries of the intervals
n_intervals = interval_bounds.size - 1 #number of intervals, given max age
intervals = np.arange(n_intervals) #indexes of intervals in a vector

#determine death matrix and exposure matrix
last_period = np.floor((df.age - 0.01) / interval_length).astype(int) #last period where a character was observed
  
death = np.zeros((num_characters, n_intervals)) #matrix rows = chars, cols = intervals, cell = 1 if character died in this interval
death[characters, last_period]=df.isDead

exposure = np.greater_equal.outer(df.age, interval_bounds[:-1])*interval_length #matrix rows=chars, cols=intervals, cell = #years character was exposed to risk in this interval
exposure[characters, last_period] = df.age - interval_bounds[last_period]
exposure=exposure.astype(np.float) #keep it as a float for calculation purposes

#too many zeroes in the exposure matrix apparently cause a lot of problems, so just replace them with sth very small
filter_func = np.vectorize(lambda v: 1e-200 if v<=0 else v) #assuming a tiny chance of dying after you're dead isn't so bad, is it?
exposure = filter_func(exposure)

#convert the DataFrame into a numPy array (also exclude columns we don't want to have as training parameters)
df_dropped = df.drop(["age", "isDead", "name"], axis=1)
colNames = df_dropped.columns.values.tolist() #will use later when writing the prediction file
df_num=df_dropped.to_numpy().astype(float) #characters=rows, attributes=cols
num_parameters = df_num.shape[1];

SEED = random.randint(1,10000000) #will be used in the sampler
#create the model
with pm.Model() as model:
  lambda0 = pm.Gamma('lambda0', mu=0.01, sd=0.01, shape=n_intervals) #this is a vector (base risk to die in a time slice)
  beta = pm.Normal('beta', mu=0, sd=1000, shape=num_parameters) #this is a vector (one coefficient per covariate)
  lambda_ = pm.Deterministic('lambda_', T.outer(T.exp(T.dot(df_num, beta)), lambda0)) #this is a matrix (risk of character(row) in a time slice(col))
  mu = pm.Deterministic('mu', exposure*lambda_) #this is also a matrix (risk = 0 if character already dead, otherwise same as lambda_)
  obs = pm.Poisson('obs', mu, observed=death) 
  
n_samples = 1000 #both should be 1000, 100 for quick testing
n_tune = 1000
#now, sample the model
with model:
  trace = pm.sample(n_samples, tune = n_tune, random_seed=SEED)
  
# trace['beta'] is a matrix. Rows = all the samples, colums = sampled beta vector
# trace['lambda'] is a matrix, rows = all the samples, cols = sampled chance to die in a given time slice

def get_dotprodfactors(params): #get the hazard multipliers (not yet exponentiated) for each step of the trace, depending on the parameters
  return trace['beta'].dot(np.atleast_2d(params).transpose())

def calc_hazard(dotprodfactors): #calculates hazard values for each time slice up to, but not including, time, dependent on the params
  return trace['lambda0']*np.exp(dotprodfactors)
  
def cum_hazard(hazard): #given hazard-per-timeslice values, calculate cumulative hazard
  return (interval_length*hazard).cumsum(axis=-1)
  
def survival(hazard): #describes likelihood of surviving the cumulative hazard
  return np.exp(-cum_hazard(hazard))
  
def survivalParams(params): #describes survival function, given some params
  return survival(calc_hazard(get_dotprodfactors(params)))
  
def meanSurvivalParams(params): #takes the mean out of the whole trace for the survival function
  return survivalParams(params).mean(axis=0)
  
def fitAge(survivalFn, chance): #given a survial function (vector of probabilities), find the highest age with over 'chance' chance of survival
  return (n_intervals-np.searchsorted(np.flip(survivalFn), chance))*interval_length
  
#Now construct the output file
predictions = {} #we'll write this dict to a JSON
predictions["priorHazard"] = trace['lambda0'].mean(axis=0).astype(float).tolist()
predictions["attributes"] = colNames
mean_beta = trace['beta'].mean(axis=0) # make a mean of all rows in the entire trace, transform the column matrix into a (single-) row matrix and get the row out
predictions["meanBetaExp"] = np.exp(mean_beta).astype(float).tolist()
predictions["characters"] = []
#now add the survial function for every character
for i in range(0, num_characters):
  ch = {} #this dict will represent the character's survival function
  ch["name"] = df["name"][i]
  ch["alive"] = False if df["isDead"][i] > 0 else True
  ch["age"] = df["age"].astype(float)[i]
  survFn= meanSurvivalParams(df_num[i, :]).astype(float).tolist() #take the i-th row of df_num for the character's parameters
  ch["predictedSurvivalAge"] = fitAge(survFn, 0.5).astype(float)
  confidence = 0.8
  ch["confIntervalLower"] = fitAge(survFn, confidence).astype(float)
  ch["confIntervalHigher"] = fitAge(survFn, 1-confidence).astype(float)
  ch["confIntervalConfidence"] = confidence
  ch["survivalFunction"] = survFn
  predictions["characters"].append(ch)
  
#now write the predictions object to a file
output = open('predictorOutput.json', 'w')
json.dump(predictions, output, indent=2)