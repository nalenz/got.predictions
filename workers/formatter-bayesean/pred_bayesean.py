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

#too many zeroes in exposure apparently cause a lot of problems, so just replace them with sth very small
filter_func = np.vectorize(lambda v: 1e-200 if v<=0 else v)
exposure = filter_func(exposure)

#np.savetxt('exposure.csv', exposure, delimiter=',')

df = pd.concat([df.male, df.isHeir, df.numTitles, df.pageRankLog], axis=1) #TODO take only a few columns as a test

df_num=df.to_numpy().astype(float) #characters=rows, attributes=cols
num_parameters = df_num.shape[1];

SEED = 925449 #from random.org :)

with pm.Model() as model:
  lambda0 = pm.Gamma('lambda0', mu=0.01, sd=0.01, shape=n_intervals) #this is a vector (base risk to die in a time slice)
  beta = pm.Normal('beta', mu=0, sd=1000, shape=(num_parameters,1)) #this is another vector (one coefficient per covariate)
  lambda_ = pm.Deterministic('lambda_', T.outer(T.exp(T.dot(df_num, beta)), lambda0)) #this is a matrix (risk of character(row) in a time slice(col))
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
  
n_samples = 1000 #both should be 1000, 100 for quick testing
n_tune = 1000
with model:
  trace = pm.sample(n_samples, tune = n_tune, random_seed=SEED) #nuts_kwargs = {"target_accept":0.95}
  
end_beta = trace['beta'].mean(axis=0).transpose()[0] #make a mean of all rows in the entire trace, transform the column matrix into a (single-) row matrix and get the row out
print(np.exp(end_beta))