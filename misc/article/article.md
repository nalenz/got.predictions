# Neural Network

Another approach we tested was to train a neural network to predict the probability for a character to die in any given year. Similarly to the Bayesean model, this also allows us to construct a survival function, but the neural network can potentially look for more complex patterns than the Bayesean model will. The neural network can also potentially encapsulate more "surprising” deaths that the Bayesean model might consider to be random outliers.

For this model, we used Python's Keras framework.

Basically, one of the easiest neural network architectures uses the Feed Forward technique. This means that the input is a vector with any number of real-valued dimensions, then it is processed via so-called "hidden layers" in between and the final output is a vector of numbers as well. Furthermore, a neural network consists of many parameters, which are adjusted during training. Training is the step in which these parameters are changed automatically, so they make the network output resemble the given input-output relation as closely as possible.

We now had to think about how to transform the complex information associated to a character into a vector. Some information is scalar, for example a character's page rank in the wiki or its number of relationships. Other information, for example the episodes the character appears in, has a set of pre-defined values. Thus, we can create a vector with as many dimensions as there are episodes and set a dimension to 1.0 if the character appears in the respective episode and to 0.0 otherwise. This way, different kinds of information can be transformed into vectors and these vectors are just appended to each other. In the end, we had 1561 input dimensions for the book data and 411 for the show data. For reference, these are the types of data we used:

- book: gender, page rank, number of relatives, age, culture, house, region of house, allegiances, books the character was part of, locations, titles
- show: gender, page rank, number of relatives, age, allegiances, episodes the character appeared in, titles

In general, becoming older is still the most important factor regarding a character's likelihood of death; after all, the older you are, the more danger you have been exposed to in the past! That's why the character's current age (as a one-hot vector like described before) is also part of the neural network input. Because the neural network output is just one dimension determining the "percentage likelihood of survival" as a number between 0 and 1, it is then possible to create about 90 different input vectors for a single character: one for each possible age. If the character was still alive by that age, the neural network shall predict 1.0 for that input vector, and 0.0 otherwise.

Additionally, this allows predicting transitions in the PLOS over time: modifying a character's input age is easy and directly relates to changes in PLOS. Finally, the percentage likelihood of death we display next to the character is just the PLOS at the year season 8 will take place in, subtracted from 1.0.
