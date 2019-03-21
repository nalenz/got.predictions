from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import pymc3 as pm
from pymc3.distributions.timeseries import GaussianRandomWalk
from theano import tensor as T

df = pd.read_json(path_or_buf = "ref_chs.json", typ = "frame")

num_characters = df.shape[0]
characters = np.arange(num_characters)

interval_length = 3
interval_bounds = np.arange (0, df.age.max() + interval_length + 1, interval_length)
n_intervals = interval_bounds.size - 1
intervals = np.arange(n_intervals)

last_period = np.floor((df.age - 0.01) / interval_length).astype(int)
  
death = np.zeros((num_characters, n_intervals))
death[characters, last_period]=df.isDead

exposure = np.greater_equal.outer(df.age, interval_bounds[:-1])*interval_length
exposure[characters, last_period] = df.age - interval_bounds[last_period]
exposure=exposure.astype(np.float)

#exposure occasionally contains -120. Replace them with near-zeroes as a temporary fix
filter_func = np.vectorize(lambda v: 1e-200 if v<=0 else v) 
exposure = filter_func(exposure)

#np.savetxt('exposure.csv', exposure, delimiter=',')

SEED = 925449 #from random.org :)

with pm.Model() as model:
  lambda0 = pm.Gamma('lambda0', 0.01, 0.01, shape=n_intervals) #this is a vector (base risk by time slice)
  beta = pm.Normal('beta', 0, sd=1000) #this is another vector (one coefficient per covariate)
  lambda_ = pm.Deterministic('lambda_', T.outer(T.exp(beta*df.male), lambda0)) #this is a matrix (risk of character(row) in a time slice(col))
  mu = pm.Deterministic('mu', exposure*lambda_) #this is also a matrix (risk = 0 if character already dead, otherwise same as lambda_)
  obs = pm.Poisson('obs', mu, observed=death) 
  #betaVal = beta.random()
  #lambda0Val = lambda0.random()
  #print(betaVal)
  #print(lambda0Val)
  #lambda_Val = np.outer(np.exp(betaVal*df.male), lambda0Val)
  #muVal = exposure*lambda_Val
  #np.savetxt('lambda_.csv', lambda_Val, delimiter=',')
  #np.savetxt('mu.csv', muVal, delimiter=',')
  #for RV in model.basic_RVs: #logp of obs goes to -inf?? Maybe there's an entire row of zeroes or something?
  #  print(RV.name, RV.logp(model.test_point))
  #
  
n_samples = 1000
n_tune = 1000
with model:
  trace = pm.sample(n_samples, tune = n_tune, random_seed=SEED) #nuts_kwargs = {"target_accept":0.95}
  
print(np.exp(trace['beta'].mean()))

base_hazard = trace['lambda0']
met_hazard = trace['lambda0'] * np.exp(np.atleast_2d(trace['beta']).T)

def cum_hazard(hazard):
  return (interval_length * hazard).cumsum(axis=-1)
  
def survival(hazard):
  return np.exp(-cum_hazard(hazard))
  
