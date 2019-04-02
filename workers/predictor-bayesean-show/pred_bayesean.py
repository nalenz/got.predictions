from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import pymc3 as pm
from pymc3.distributions.timeseries import GaussianRandomWalk
from theano import tensor as T
import random
import json
import math

#read input file
df = pd.read_json(path_or_buf = "../formatter-bayesean-show/ref_chs.json", typ = "frame")

df.livedTo += 1; #TODO messy fix...

#get some parameters
num_characters = df.shape[0]
characters = np.arange(num_characters) #vector 1....num_characters

#set parameters
interval_length = 1 #discretization over interval_length-year intervals
interval_bounds = np.arange (0, df.livedTo.max() + interval_length + 1, interval_length) #vector describing the boundaries of the intervals
n_intervals = interval_bounds.size - 1 #number of intervals, given max livedTo
intervals = np.arange(n_intervals) #indexes of intervals in a vector

#determine death matrix and exposure matrix
last_period = np.floor((df.livedTo - 0.01) / interval_length).astype(int) #last period where a character was observed
  
death = np.zeros((num_characters, n_intervals)) #matrix rows = chars, cols = intervals, cell = 1 if character died in this interval
death[characters, last_period]=df.isDead

exposure = np.greater_equal.outer(df.livedTo, interval_bounds[:-1])*interval_length #matrix rows=chars, cols=intervals, cell = #years character was exposed to risk in this interval
exposure[characters, last_period] = df.livedTo - interval_bounds[last_period]
exposure=exposure.astype(np.float) #keep it as a float for calculation purposes

#too many zeroes in the exposure matrix apparently cause a lot of problems, so just replace them with sth very small
filter_func = np.vectorize(lambda v: 1e-200 if v<=0 else v) #assuming a tiny chance of dying after you're dead isn't so bad, is it?
exposure = filter_func(exposure)

#convert the DataFrame into a numPy array (also exclude columns we don't want to have as training parameters)
df_dropped = df.drop(["livedTo", "isDead", "name"], axis=1)
colNames = df_dropped.columns.values.tolist() #will use later when writing the prediction file
df_num=df_dropped.to_numpy().astype(float) #characters=rows, attributes=cols
num_parameters = df_num.shape[1];

SEED = random.randint(1,10000000) #will be used in the sampler
#create the model
with pm.Model() as model:
  lambda0 = pm.Gamma('lambda0', mu=0.15, sd=0.1, shape=1) #this is a scalar (base chance to die per episode)
  beta = pm.Normal('beta', mu=0, sd=1000, shape=num_parameters) #this is a vector (one coefficient per covariate)
  lambda_ = pm.Deterministic('lambda_', T.outer(T.exp(T.dot(df_num, beta)), lambda0)) #this is a matrix (risk of character(row) in a time slice(col))
  mu = pm.Deterministic('mu', exposure*lambda_) #this is also a matrix (risk = 0 if character already dead, otherwise same as lambda_)
  obs = pm.Poisson('obs', mu, observed=death) 
  
n_samples = 1000 #both should be 1000, 100 for quick testing
n_tune = 1000
acceptance_probability = 0.85
num_chains = 2
#now, sample the model
with model:
  trace = pm.sample(n_samples, tune = n_tune, random_seed=SEED, chains = num_chains, nuts_kwargs = dict(target_accept=acceptance_probability))
  
#print(trace['beta'].mean(axis = 0))
#print(trace['lambda0'])

beta = trace['beta'] #rows = samples, columns = coefficients
lambda0 = trace['lambda0'] #rows = samples, single column = base risk per episode

num_slices = 20 #since lambda0 is the same for all slices, this indicates how far into the future the model must look

def get_dotprodfactors(params): #get the hazard multipliers (not yet exponentiated) for each sample of the trace, depending on the parameters
  return trace['beta'].dot(np.atleast_2d(params).transpose()) #mutliple dot products => matrix multiplication

def calc_hazard(dotprodfactors): #calculates hazard values for each time slice up to, but not including, time, dependent on the params
  return (trace['lambda0'] * np.ones(num_slices)) * np.exp(dotprodfactors)
  
def cum_hazard(hazard): #given hazard-per-timeslice values, calculate cumulative hazard
  return (interval_length*hazard).cumsum(axis=-1)
  
def survival(hazard): #describes likelihood of surviving the cumulative hazard
  return np.exp(-cum_hazard(hazard))
  
def survivalParams(params): #describes survival function distribution (i.e. a set of samples, each being a survival function), given some params
  return survival(calc_hazard(get_dotprodfactors(params)))
  
def fitAge_greater_equal(survFn, greaterThan): #how many years are equally or more probable than greaterThan?
  fits = np.greater_equal(survFn, greaterThan).astype(int).sum(axis=1)*interval_length
  return fits
  
def fitAge_greater_equal_mean(survFn, greaterThan):
  return fitAge_greater_equal(survFn, greaterThan).mean()
  
def fitAge_greater_equal_last(survFn, greaterThan):
  return fitAge_greater_equal(survFn, greaterThan)[-1]
  
#Now construct the output file
predictions = {} #we'll write this dict to a JSON
predictions["priorHazard"] = trace['lambda0'].mean(axis=0).astype(float).tolist()
predictions["attributes"] = colNames
mean_beta = trace['beta'] # make a mean of all rows in the entire trace, transform the column matrix into a (single-) row matrix and get the row out
predictions["meanBetaExp"] = np.exp(mean_beta).astype(float).mean(axis=0).tolist()
predictions["characters"] = []
#now add the survial function for every character
for i in range(0, num_characters):
  ch = {} #this dict will represent the character's survival function
  ch["name"] = df["name"][i]
  ch["alive"] = False if df["isDead"][i] > 0 else True
  ch["livedTo"] = df["livedTo"].astype(float)[i]
  survFn= survivalParams(df_num[i, :]).astype(float) #take the i-th row of df_num for the character's parameters
  fitAge50 = fitAge_greater_equal(survFn, 0.5).astype(float)
  ch["predictedSurvivalAge"] = fitAge50.mean() #.tolist()
  #ch["likelihoodSeason8"] = (np.sum(np.greater_equal(fitAge50, 8).astype(float)))/(n_samples*num_chains)
  confidence = 0.8
  #ch["confIntervalLower"] = fitAge_greater_equal(survFn, confidence).astype(float).tolist()
  #ch["confIntervalHigher"] = fitAge_greater_equal(survFn, 1-confidence).astype(float).tolist()
  #ch["confIntervalConfidence"] = confidence
  ch["survivalFunctionMean"] = survFn.mean(axis=0).tolist()
  predictions["characters"].append(ch)
  
#now write the predictions object to a file
output = open('predictorOutput.json', 'w')
json.dump(predictions, output, indent=2)
