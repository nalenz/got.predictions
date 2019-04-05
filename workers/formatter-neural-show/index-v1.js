const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  // attributes for data
  const dataScalarAttrs = ['male', 'pageRank', 'numRelatives'];
  const dataVectorAttrs = ['age', 'allegiances', 'appearances', 'cultures', 'titles'];

  // read formatted data
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterShowMLData('chars-to-train'),
    utils.loadFormatterShowMLData('chars-to-predict'),
  ]);

  // create final data and labels, note that training data is shuffled to improve validation later
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs);
  let [dataTrain, labelsTrain] = utils.shuffleTwoArrays(
    johv.createMultipleUnfolded(charsTrain, 'age', (char, currAge) => [char.age >= currAge ? 1.0 : 0.0]),
  );
  const dataPredict = johv.createMultipleUnfoldedOnlyData(
    charsPredict,
    'age',
    { min: config.GOT_CURRENT_YEAR_SHOW, max: config.GOT_CURRENT_YEAR_SHOW + config.PREDICTIONS_NUM_YEARS },
    (char, currYear, ageRange) => utils.clamp(currYear - char.birth, ageRange),
  );

  // write data and labels to output file
  await utils.writeOutputDataBinary('v1-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v1-data-predict', dataPredict, true);
  await utils.writeOutputDataBinary('v1-labels-train', labelsTrain, true);
})();
