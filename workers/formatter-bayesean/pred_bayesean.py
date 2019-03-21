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

interval_length = 1
interval_bounds = np.arange (0, df.age.max() + interval_length + 1, interval_length)
n_intervals = interval_bounds.size - 1
intervals = np.arange(n_intervals)

last_period = np.floor((df.age - 0.01) / interval_length).astype(int)
  
death = np.zeros((num_characters, n_intervals))
death[characters, last_period]=df.isDead

exposure = np.greater_equal.outer(df.age, interval_bounds[:-1])*interval_length
exposure[characters, last_period] = df.age - interval_bounds[last_period]

SEED = 925449

with pm.Model() as model:
  lambda0 = pm.Gamma('lambda0', 0.01, 0.01, shape=n_intervals) #this is a vector (base risk by time slice)
  beta = pm.Normal('beta', 0, sd=1000) #this is a scalar (only one covariate)
  lambda_ = pm.Deterministic('lambda_', T.outer(T.exp(beta*df.male), lambda0)) #this is a matrix (risk of character(row) in a time slice(col))
  mu = pm.Deterministic('mu', exposure*lambda_) #this is also a matrix (risk = 0 if character already dead, otherwise same)
  obs = pm.Poisson('obs', mu, observed=death) #Problem with the mean here causes obs to go to -inf, maybe because it's only a matrix distribution and not an actual matrix?
  for RV in model.basic_RVs:
    print(RV.name, RV.logp(model.test_point))
	
  
n_samples = 1000
n_tune = 1000
with model:
  trace = pm.sample(n_samples, tune = n_tune, random_seed=SEED)
  
