const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  // attributes for data
  const dataScalarAttrs = ['male', 'isBastard', 'pageRank', 'numRelatives', 'numCommandedBattles'];
  const dataVectorAttrs = ['age', 'allegiances', 'appearances', 'cultures', 'titles'];

  // read formatted data
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterShowMLData('chars-to-train'),
    utils.loadFormatterShowMLData('chars-to-predict'),
  ]);

  // gender distribution: 74.39% of characters are male
  let charsTrainMale = charsTrain.filter(c => c.male);
  let charsTrainFemale = charsTrain.filter(c => !c.male);
  let numCharsTrainMale = Math.round(charsTrainMale.length * 0.7);
  let numCharsTrainFemale = Math.round(charsTrainFemale.length * 0.7);
  let charsTrainActual = utils.shuffleArray(
    charsTrainMale.slice(0, numCharsTrainMale).concat(charsTrainFemale.slice(0, numCharsTrainFemale)),
  );
  let charsTestActual = utils.shuffleArray(charsTrainMale.slice(numCharsTrainMale).concat(charsTrainFemale.slice(numCharsTrainFemale)));

  // create final data and labels, note that training data is shuffled to improve validation later
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs);
  let [dataTrain, labelsTrain] = johv.createMultipleUnfolded(charsTrainActual, 'age', (char, currAge) => [char.age >= currAge ? 1.0 : 0.0]);
  let [dataTest, labelsTest] = johv.createMultipleUnfolded(charsTestActual, 'age', (char, currAge) => [char.age >= currAge ? 1.0 : 0.0]);
  const dataPredict = johv.createMultipleUnfoldedOnlyData(
    charsPredict,
    'age',
    { min: config.GOT_CURRENT_YEAR_SHOW, max: config.GOT_CURRENT_YEAR_SHOW + config.PREDICTIONS_NUM_YEARS },
    //(char, currYear, ageRange) => utils.clamp(currYear - char.birth, ageRange),
  );

  // output some final statistics
  console.log(`number of training datapoints      : ${dataTrain.length}`);
  console.log(`number of testing datapoints       : ${dataTest.length}`);
  console.log(`number of dimensions per datapoint : ${dataTrain[0].length}`);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v1-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v1-data-test', dataTest, true);
  await utils.writeOutputDataBinary('v1-data-predict', dataPredict, true);
  await utils.writeOutputDataBinary('v1-labels-train', labelsTrain, true);
  await utils.writeOutputDataBinary('v1-labels-test', labelsTest, true);
})();
