const utils = require('../common/utils');

(async () => {
  // attributes for data
  const dataScalarAttrs = ['male', 'pageRank'];
  const dataVectorAttrs = ['age', 'books', 'house', 'locations', 'titles'];

  // read data and determine ranges for all attributes
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterMLData('chars-to-train'),
    utils.loadFormatterMLData('chars-to-predict'),
  ]);

  // create final data and labels
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs);
  const [dataTrain, labelsTrain] = johv.createMultipleUnfolded(charsTrain, 'age', (char, currAge) => [char.age >= currAge ? 1.0 : 0.0]);
  const dataPredict = johv.createMultipleUnfoldedOnlyData(charsPredict, 'age', { min: 300, max: 320 }, (char, currYear, ageRange) =>
    utils.clamp(currYear - char.dateOfBirth, ageRange),
  );

  // write data and labels to output file
  await utils.writeOutputDataBinary('v2-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v2-data-predict', dataPredict, true);
  await utils.writeOutputDataBinary('v2-labels-train', labelsTrain, true);
})();
