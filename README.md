# got.predictions

## Setup

To run the code in this repository, Node (at least version 10) is needed. Additionally, to run the predictor workers, make sure that Python (at least version 3.5) is installed and that you have the dependencies (i.e. run `pip3 install -r workers/predictors-bayesian/requirements.txt` and `pip3 install -r workers/predictors-neural/requirements.txt`). The code in this repository was only tested using Ubuntu 16.04.

Please run `npm install` after cloning the repository to install all dependencies or when the dependencies changed after pulling. Afterwards, use Visual Studio Code as your IDE to immediately start working with ESLint and Prettier being directly integrated then.

Note that this repository consists of two different models which both aim for predicting the likelihood of death/survival of GoT characters. Their usage is explained in the following.

## Using the Bayesean model

The Bayesean model can be used as follows:

1. If you need to, refetch the data by running `./refetch.sh` in `data/book` and `data/show`.
2. Run `node workers/formatter-bayesean-book` and `node workers/formatter-bayesean-show`. They will read out the features for training used for data and will generate a JSON file in their own directory (`training_book_characters.json` or `training_show_characters.json`).
3. Run the predictor scripts in `workers/predictors-bayesian/predictor-bayesean-book` and `workers/predictors-bayesian/predictor-bayesean-show`. This can be done directly (`python3 workers/predictors-bayesian/predictor-bayesean-book/predictor.py`) or using Node (`node workers/predictors-bayesian/predictor-bayesean-book`).
4. The predictors will produce an output JSON in their own directory (`book_predictor_output.json`, `show_predictor_output.json`). Run the postprocessors to filter out dead characters and the unnecessary data: `node workers/postprocessor-bayesean-book`, `node workers/postprocessor-bayesean-show`.
5. To upload the predictions to the website, use `node workers/uploader-predictions-bayesean`. To upload only the attributes used and their average influences, use `node workers/uploader-attributes-bayesean`.

## Using neural networks

For creating the book predictions yourself, several steps are needed:

1. Format the data into an intermediate JSON format by running `node workers/formatter`.
2. Create a zlib-inflated chunk of neural network data by running `node workers/formatter-neural/index-v2.js`.
3. Edit the file `workers/predictors-neural/predictor-neural-v1/predictor.py` to have `if True:` in line 28, then run it using `./predictor.py`.
4. Change that line back to `if False:`, then run that script again using `./predictor.py`. The final predictions can now be found in `workers/predictors-neural/predictor-neural-v2/output/predictions.json`.
5. To upload the predictions to the website, use `node workers/uploader-predictions`.

The process for creating the show predictions is almost identical, just use the `formatter-show`, `formatter-neural-show` and `predictors-neural/predictor-neural-show-v1` worker directories, in that order.

## Code management

### Creating new branches

To create a new branch to add your changes to, please execute the following commands and replace `my-new-branch` by the desired name of your branch.

1. `git checkout master`
2. `git checkout -b my-new-branch`
3. `git push origin my-new-branch`
4. `git push --set-upstream origin my-new-branch`

## Neural network predictions

- book
  - [PLOS for characters from years 300 to 320](workers/predictors-neural/predictor-neural-v2/output/predictions.json)
  - [single PLOD only](workers/predictors-neural/predictor-neural-v2/output/predictions-plod.json)
- show
  - [PLOS for characters from years 305 to 325](workers/predictors-neural/predictor-neural-show-v1/output/predictions.json)
  - [single PLOD only](workers/predictors-neural/predictor-neural-show-v1/output/predictions-plod.json)

### Book predictions

- number of characters: 484
  - used for training (i.e. dead): 188, predicted on (i.e. alive): 296
- number of training datapoints: 18800
  - used for training itself: 15040, used for validation: 3760
  - final training accuracy: 88.75%, final validation accuracy: 89.92% (from [Keras log](workers/predictors-neural/predictor-neural-v2/models/keras-log))
- number of dimensions per datapoint: 1561
  - scalar values
    - male: 1, page rank (normalized): 1, number of relatives (normalized): 1
  - one hot vectors
    - age: 100, culture: 57, house: 360, house region: 29
  - multiple hot vectors
    - allegiances: 396, books: 19, locations: 82, titles: 515
- number of output dimensions: 1
  - 1.0 if alive, 0.0 otherwise

### Show predictions

- number of characters: 146
  - used for training (i.e. dead): 82, predicted on (i.e. alive): 64
- number of training datapoints: 7052
  - used for training itself: 6346, used for validation: 706
  - final training accuracy: 81.00%, final validation accuracy: 84.56% (from [Keras log](workers/predictors-neural/predictor-neural-show-v1/models/keras-log))
- number of dimensions per datapoint: 413
  - scalar values
    - male: 1, is bastard: 1, page rank (normalized): 1, number of relatives (normalized): 1, number of commanded battles (normalized): 1
  - one hot vectors
    - age: 86
  - multiple hot vectors
    - allegiances: 130, appearances: 74, titles: 118
- number of output dimensions: 1
  - 1.0 if alive, 0.0 otherwise
