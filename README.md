# got.predictions

## Setup

To run the code in this repository, Node (at least version 10) is needed. Additionally, to run the `predictor-neural` worker, make sure that Python (at least version 3.5) is installed and that you have the dependencies (i.e. run `pip install -r requirements.txt` in that directory).

Please run `npm install` after cloning the repository to install all dependencies or when the dependencies changed after pulling. Afterwards, use Visual Studio Code as your IDE to immediately start working with ESLint and Prettier being directly integrated then.

## Code management

### Creating new branches

To create a new branch to add your changes to, please execute the following commands and replace `my-new-branch` by the desired name of your branch.

1. `git checkout master`
2. `git checkout -b my-new-branch`
3. `git push origin my-new-branch`
4. `git push --set-upstream origin my-new-branch`

## Predictor drafts

### Version 1 (11.03.2019)

- Type: neural network
- Architecture: fully connected layers, 1102 input values --> 200 ReLU neurons --> 100 ReLU-activated neurons --> 85 sigmoid-activated neurons
- Input data
  - dimension 0: 1.0 for male, 0.0 otherwise
  - dimension 1: normalized page rank, i.e. 1.0 for highest possible page rank, value very close to 0 for lowest page rank
  - numBooks (16) dimensions: one-hot vector for each book the character appeared in (i.e. 1.0 if he did, 0.0 otherwise)
  - numHouses (457) dimensions: one-hot vector for the house the character is part of
  - numLocations (186) dimensions: one-hot vector for the locations the character visited
  - numTitles (445) dimensions: one-hot vector for the titles the character has
- Output data
  - one-hot vector with 85 dimensions for every possible age (zero to 84)
- Summary
  - Out of 448 characters which have at least the birth date associated with them, 285 are alive and 163 (i.e. also have a death date).
  - This dataset is way too small for machine learning. Although accuracy reached almost 100% during training, the network did not generalize to the alive characters, as illogical output values appeared.
  - The main problem was that a character's age of death was predicted. Thus, no boundary was given that would limit this prediction to be _after_ the current year and a lot of death ages of alive characters were predicted that were before the current year.
