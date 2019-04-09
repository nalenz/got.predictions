#!/bin/bash
#cd ./data/book
#./refetch.sh
#cd ../show
#./refetch.sh
#cd ../..
node workers/formatter-bayesean-book
node workers/formatter-bayesean-show
node workers/predictors-bayesian/predictor-bayesean-book
node workers/predictors-bayesian/predictor-bayesean-show
node workers/postprocessor-bayesean-book
node workers/postprocessor-bayesean-show
#node workers/uploader-attributes-bayesean
