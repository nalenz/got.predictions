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
  const [dataTrain, labelsTrain] = johv.createMultipleUnfolded(charsTrain, 'age', (char, currAge, ageRange) => {
    let ret = new Array(ageRange.span).fill(0);
    for (let i = 0; i < char.age - currAge; ++i) ret[i] = 1.0;
    return ret;
  });
  const dataPredict = johv.createMultiple(charsPredict);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v3-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v3-data-predict', dataPredict, true);
  await utils.writeOutputDataBinary('v3-labels-train', labelsTrain, true);
})();
