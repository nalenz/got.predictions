# got.predictions
![alt text](https://www.hypable.com/wp-content/uploads/2016/05/game-of-thrones-hall-of-faces.jpg)
## Setup

To run the code in this repository, Node (at least version 10) is needed. Additionally, to run the `predictor-neural` worker, make sure that Python (at least version 3.5) is installed and that you have the dependencies (i.e. run `pip install -r requirements.txt` in that directory).

Please run `npm install` after cloning the repository to install all dependencies or when the dependencies changed after pulling. Afterwards, use Visual Studio Code as your IDE to immediately start working with ESLint and Prettier being directly integrated then.

## Creating the book predictions using its neural network

For creating the book predictions yourself, several steps are needed:

1. Format the data into an intermediate JSON format by running `node index.js` in the `workers/formatter` directory.
2. Create a zlib-inflated chunk of neural network data by running `node index-v2.js` in the `workers/formatter-neural` directory.
3. Edit the file `workers/predictors-neural/predictor-neural-v1/predictor.py` to have `if True:` in line 28, then run it using `./predictor.py`.
4. Change that line back to `if False:`, then run that script again using `./predictor.py`. The final predictions can now be found in `workers/predictors-neural/predictor-neural-v2/output/predictions.json`.

## Code management

### Creating new branches

To create a new branch to add your changes to, please execute the following commands and replace `my-new-branch` by the desired name of your branch.

1. `git checkout master`
2. `git checkout -b my-new-branch`
3. `git push origin my-new-branch`
4. `git push --set-upstream origin my-new-branch`

## Neural network predictions

- [Book](workers/predictors-neural/predictor-neural-v2/output/predictions.json) (PLOS for characters from years 300 to 320)
- [Show](workers/predictors-neural/predictor-neural-show-v1/output/predictions.json) (PLOS for characters from years 305 to 325)

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
  - final training accuracy: 79.64%, final validation accuracy: 85.69% (from [Keras log](workers/predictors-neural/predictor-neural-show-v1/models/keras-log))
- number of dimensions per datapoint: 411
  - scalar values
    - male: 1, page rank (normalized): 1, number of relatives (normalized): 1
  - one hot vectors
    - age: 86
  - multiple hot vectors
    - allegiances: 130, appearances: 74, titles: 118
- number of output dimensions: 1
  - 1.0 if alive, 0.0 otherwise
