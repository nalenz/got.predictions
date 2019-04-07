cd ./data/book
./refetch.sh
cd ../show
./refetch.sh
node workers/formatter-bayesean-book
node workers/formatter-bayesean-show
node workers/predictor-bayesean-book
node workers/predictor-bayesean-show
node workers/postprocessor-bayesean-book
node workers/postprocessor-bayesean-show
node workers/uploader-attributes-bayesean