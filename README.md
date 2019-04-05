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
- [Show](workers/predictors-neural/predictor-neural-show-v1/output/predictions.json) (PLOS for characters from years 304 to 320)

### Book predictions

- number of datapoints: 11250
  - used for training: 9000, used for validation: 2250
  - final training accuracy: 88.72%, final validation accuracy: 91.56% (from [Keras log](workers/predictors-neural/predictor-neural-v2/models/keras-log))
- number of dimensions per datapoint: 1175
  - scalar values
    - male: 1, page rank (normalized): 1, number of relatives (normalized): 1
  - one hot vectors
    - age: 90, culture: 44, house: 269, house region: 29
  - multiple hot vectors
    - allegiances: 295, books: 17, locations: 82, titles: 346
- number of output dimensions: 1
  - 1.0 if alive, 0.0 otherwise

### Show predictions

- number of datapoints: 3096
  - used for training: 2786, used for validation: 310
  - final training accuracy: 79.33%, final validation accuracy: 79.35% (from [Keras log](workers/predictors-neural/predictor-neural-show-v1/models/keras-log))
- number of dimensions per datapoint: 398
  - scalar values
    - male: 1, page rank (normalized): 1, number of relatives (normalized): 1
  - one hot vectors
    - age: 86
  - multiple hot vectors
    - allegiances: 123, appearances: 72, titles: 114
- number of output dimensions: 1
  - 1.0 if alive, 0.0 otherwise
