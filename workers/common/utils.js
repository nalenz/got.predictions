const path = require('path');
const fs = require('fs-extra');
const zlib = require('zlib');
const request = require('request-promise-native');
const config = require('./config');

const dirnameMain = path.dirname(require.main.filename);

/**
 * Loads a JSON file which contains GoT information from the books.
 * @param {string} name - The name of the desired dataset.
 */
function loadBookData(name) {
  return fs.readJSON(path.join(__dirname, `../../data/book/${name}.json`));
}

/**
 * Loads a JSON file which contains GoT information from the TV show.
 * @param {string} name - The name of the desired dataset.
 */
function loadShowData(name) {
  return fs.readJSON(path.join(__dirname, `../../data/show/${name}.json`));
}

/**
 * Loads a JSON file which contains preprocessed information from the GoT books used by the
 * machine learning scripts.
 * @param {string} name - The type of ML data, namely `chars-to-train` for the characters
 * training shall happen with or `chars-to-predict` for the characters the predictions will be made for.
 */
function loadFormatterMLData(name) {
  return fs.readJSON(path.join(__dirname, `../formatter/output/ml-data/${name}.json`));
}

/**
 * Loads a JSON file which contains preprocessed information from the GoT TV show used by the
 * machine learning scripts.
 * @param {string} name - The type of ML data, namely `chars-to-train` for the characters
 * training shall happen with or `chars-to-predict` for the characters the predictions will be made for.
 */
function loadFormatterShowMLData(name) {
  return fs.readJSON(path.join(__dirname, `../formatter-show/output/ml-data/${name}.json`));
}

/**
 * Loads the JSON file of the book predictions.
 */
function loadPredictionsBook() {
  return fs.readJSON(path.join(__dirname, '../predictors-neural/predictor-neural-v2/output/predictions.json'));
}

function loadBayeseanPredictionsBook() {
  return fs.readJSON(path.join(__dirname, '../postprocessor-bayesean-book/book_predictions.json'));
}

/**
 * Loads the JSON file of the show predictions.
 */
function loadPredictionsShow() {
  return fs.readJSON(path.join(__dirname, '../predictors-neural/predictor-neural-show-v1/output/predictions.json'));
}

function loadBayeseanPredictionsShow() {
  return fs.readJSON(path.join(__dirname, '../postprocessor-bayesean-show/show_predictions.json'));
}

/**
 * Writes some generic data to the `output` directory, relative to the main script's path.
 * Returns the written data unmodified.
 * @param {string} name - The name of the output file, without extension.
 * @param {(object|array)} data - The data whose serialized version is written to the respective file.
 */
async function writeOutputData(name, data, pretty) {
  await fs.writeJSON(path.join(dirnameMain, `output/${name}.json`), data, pretty ? { spaces: 4 } : undefined);
  return data;
}

/**
 * Returns the zlib-deflated (i.e. compressed) version of a chunk of data.
 * @param {Buffer} buf - A buffer which contains the data to be compressed.
 */
function zlibDeflate(buf) {
  return new Promise((resolve, reject) => {
    zlib.deflate(buf, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

/**
 * Writes a two-dimensional array of floating point numbers to a binary file. This file will have the
 * number of entries as well as the number of values per entry in the first eight bytes, i.e. as two
 * consecutive 32 bit little endian unsigned integer values. After that, all the single-precision (i.e.
 * 32 bit) float values follow. The resulting data will be written to a file in the `output` directory,
 * relative to the path of the main script. The file itself will have the extension `.dat` if it's
 * uncompressed and `.dat.gz` if it is compressed. For the compression, the `zlibDeflate` function
 * will be used.
 * @param {string} name - The basename of the output file, without extension.
 * @param {object} data - The data to be written to the file, in a normal, two-dimensional array. All
 * subarrays in this main array must have the same length.
 * @param {boolean} [compress=false] - Indicates if the output file shall be compressed before writing
 * it to the disk.
 */
async function writeOutputDataBinary(name, data, compress) {
  // create simple header with both dimensions (number of entries + dimensions per entry) and float32 data itself
  const headerBuf = Buffer.from(new Uint32Array([data.length, data[0].length]).buffer);
  const dataBuf = Buffer.concat(data.map(d => Buffer.from(new Float32Array(d).buffer)));

  // optionally compress output data
  let finalBuf = Buffer.concat([headerBuf, dataBuf]);
  if (compress) finalBuf = await zlibDeflate(finalBuf);

  // write output data to file
  let outStream = fs.createWriteStream(path.join(dirnameMain, `output/${name}.dat${compress ? '.gz' : ''}`));
  outStream.write(finalBuf);
  outStream.end();
}

/**
 * Sanitizes a string by removing certain quirky characters in the input data, for example invalid
 * single quotes, wiki reference strings, or leading or training quotes.
 * @param {string} s - The string to be sanitized.
 */
function sanitizeString(s) {
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/(&apos;|\u2019)/g, "'")
    .replace(/\[[0-9]+\]/g, '')
    .replace(/^"/g, '')
    .replace(/"$/g, '')
    .replace(/^'/g, '')
    .replace(/'$/g, '');
}

/**
 * Checks if the sanitized versions of two strings are equal.
 * @param {string} a - The first string to be compared.
 * @param {string} b - The second string to be compared.
 */
function sanitizedCmp(a, b) {
  return sanitizeString(a) === sanitizeString(b);
}

/**
 * Uniquifies and sorts all entries of the given array which have been modified by the given
 * function before. For an example, see the `createSetFromAttr` function, which is a specialization
 * of this one. Note that this function is only designed to deal with string arrays. It automatically
 * filters out invalid values (e.g. null or empty string), converts every string to its lower case
 * version and removes leading or trailing quotes before doing any further processing.
 * @param {object[]} arr - The array to be processed.
 * @param {function} fn - The function to be applied to every element of this array. It always needs
 * to return an array of values itself.
 */
function createSetFromAttrFunc(arr, fn) {
  return [
    ...new Set(
      []
        .concat(...arr.map(c => fn(c).map(x => x || '')))
        .filter(c => c.length > 0)
        .map(sanitizeString),
    ),
  ].sort();
}

/**
 * Extract all unique values from an array of objects which contain an array of strings at a
 * given attribute, e.g.
 * `createSetFromAttr([{a:["x","y"]}, {a:["z","x"]}, {a:["x","w"]}], "a")  ==  ["w", "x", "y", "z"]`.
 * Please see the description of the `createSetFromAttrFunc` function for further information on
 * how the strings will be processed.
 * @param {object[]} arr - The array to be processed.
 * @param {string} attr - The argument to be used from each item of the array. Note that `arr` has to
 * have an array itself at every value of this attribute.
 */
function createSetFromAttr(arr, attr) {
  return createSetFromAttrFunc(arr, n => (n[attr] instanceof Array ? n[attr] : [n[attr]]));
}

/**
 * Converts an array of actual values to indices in a base array, while eliminating invalid ones,
 * e.g. `arrToIndices(["a","b","a","c","c","d"], ["a","b","c"])  ==  [1,2,1,3,3]`.
 * Is supposed to used in correspondance with `createSetFromAttr`, i.e. also acts on the lower
 * case version of all string as well.
 * @param {string[]} arr - The array with values, most of which should appear in the `base` array.
 * @param {string[]} base - The list of base values to be used.
 */
function arrToIndices(arr, base) {
  return (arr || []).map(x => base.indexOf(sanitizeString(x))).filter(x => x !== -1);
}

/**
 * Determines how many values are given in the supplied object in total for the given list of
 * attributes. If an attribute is not set, it counts 0, if it's a single value it counts 1,
 * and if it's an array, it counts how many values are in this array.
 * @param {*} obj - The object to be looked at.
 * @param {*} attrs - The list of attributes the object will be searched through for.
 */
function countAttrValues(obj, attrs) {
  return attrs.map(a => (obj[a] instanceof Array ? obj[a].length : obj[a] ? 1 : 0)).reduce((a, b) => a + b);
}

function accumulateAttr(arr, attr, fn, alt) {
  return fn(
    arr.map(c => {
      if (c[attr] instanceof Array) return c[attr].length === 0 ? alt : fn(c[attr]);
      else return isNaN(c[attr]) ? alt : c[attr];
    }),
  );
}

/**
 * Finds the minimal value of an attribute in a list of objects.
 * @param {object[]} arr - The array to be processed.
 * @param {string} attr - The attribute that will be used to determine the minimal value of.
 */
function minAttr(arr, attr) {
  return accumulateAttr(arr, attr, a => Math.min(...a), Infinity);
}

/**
 * Finds the maximal value of an attribute in a list of objects.
 * @param {object[]} arr - The array to be processed.
 * @param {string} attr - The attribute that will be used to determine the maximal value of.
 */
function maxAttr(arr, attr) {
  return accumulateAttr(arr, attr, a => Math.max(...a), -Infinity);
}

/**
 * Finds the range of values of an attribute in a list of objects. The result is an object
 * with the `min`, `max` and `span` (i.e. `max - min + 1`) attributes.
 * @param {object[]} arr - The array to be processed.
 * @param {string} attr - The attribute that will be used to determine the range of.
 */
function extremeAttr(arr, attr) {
  let ret = { min: minAttr(arr, attr), max: maxAttr(arr, attr) };
  ret.span = ret.max - ret.min + 1;
  return ret;
}

/**
 * Returns a value that is in the desired range/interval, i.e. returns the range's `min` value
 * if `val` is below that, `max` if `val` is above that or `val` itself if it's in the range.
 * @param {number} val - The value to be clamped.
 * @param {object} rng - An object expressing the desired range using `min` and `max` attributes.
 */
function clamp(val, rng) {
  if (val < rng.min) return rng.min;
  if (val > rng.max) return rng.max;
  return val;
}

/**
 * Shuffles an array in place using the Fisher-Yates shuffle algorithm.
 * @param {array} a - The array to be shuffled.
 */
function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffles two arrays, keeping the correspondance between elements, i.e.
 * [1,2,3,4] and [11,12,13,14] can for example be shuffled to
 * [4,3,1,2] and [14,13,11,12]. This will not happen in place, but an array containing the
 * two shuffled arrays will be returned.
 * @param {array} a - The first array to be shuffled.
 * @param {array} b - The second array to be shuffled.
 */
function shuffleTwoArrays(a, b) {
  if (b === undefined) {
    b = a[1];
    a = a[0];
  }
  let shuffled = shuffleArray(a.map((x, i) => [x, b[i]]));
  return [shuffled.map(s => s[0]), shuffled.map(s => s[1])];
}

async function writeJSONSetFromAttr(arr, attr) {
  const ret = createSetFromAttr(arr, attr);
  await writeOutputData(attr, ret);
  return ret;
}

class JoinedOneHotVector {
  constructor(baseData, scalarAttrs, vectorAttrs) {
    this.scalarAttrs = scalarAttrs;
    this.ranges = this.calculateRanges(baseData, vectorAttrs);
    console.log(this.ranges);
    this.vectorAttrs = vectorAttrs.filter(a => this.ranges[a].span !== -Infinity);
    this.applyConfig(this.scalarAttrs, this.vectorAttrs);
  }

  applyConfig(localScalarAttrs, localVectorAttrs) {
    this.localScalarAttrs = localScalarAttrs;
    this.localVectorAttrs = localVectorAttrs;
    this.offsets = this.calculateOffsets(localScalarAttrs, localVectorAttrs);
    this.length = this.offsets[localVectorAttrs.slice(-1)[0]] + this.ranges[localVectorAttrs.slice(-1)[0]].span;
  }

  calculateRanges(baseData, vectorAttrs) {
    return vectorAttrs.reduce((prev, curr) => ((prev[curr] = extremeAttr(baseData, curr)), prev), {});
  }

  calculateOffsets(localScalarAttrs, localVectorAttrs) {
    return localVectorAttrs
      .slice(0, -1)
      .reduce((prev, attr, idx) => ((prev[localVectorAttrs[idx + 1]] = prev[attr] + this.ranges[attr].span), prev), {
        ...localScalarAttrs.reduce((prev, curr, idx) => ((prev[curr] = idx), prev), {}),
        [localVectorAttrs[0]]: localScalarAttrs.length,
      });
  }

  createSingle(entry) {
    let ret = new Array(this.length).fill(0);
    this.localScalarAttrs.forEach(a => (ret[this.offsets[a]] = +entry[a]));
    this.localVectorAttrs.forEach(d =>
      (entry[d] instanceof Array ? entry[d] : [entry[d]]).forEach(x => (ret[this.offsets[d] + (x - this.ranges[d].min)] = 1)),
    );
    return ret;
  }

  createMultiple(arr) {
    return arr.map(c => this.createSingle(c));
  }

  createSingleUnfolded(entry, attr, labelFn, usedRange, rangeValModifier) {
    let retMain = this.createSingle(entry);
    retMain[this.offsets[attr] + entry[attr]] = 0.0;
    if (usedRange === undefined) usedRange = this.ranges[attr];
    if (usedRange.span === undefined) usedRange.span = usedRange.max - usedRange.min + 1;
    if (rangeValModifier === undefined) rangeValModifier = (_, x) => x;
    return new Array(usedRange.span).fill(0).map((_, i) => {
      let currData = retMain.slice();
      const actualI = rangeValModifier(entry, usedRange.min + i, this.ranges[attr]);
      currData[this.offsets[attr] + actualI] = 1.0;
      return [currData, labelFn(entry, actualI, this.ranges[attr])];
    });
  }

  createMultipleUnfolded(arr, attr, labelFn, usedRange, rangeValModifier) {
    const res = [].concat(...arr.map(c => this.createSingleUnfolded(c, attr, labelFn, usedRange, rangeValModifier)));
    return [res.map(x => x[0]), res.map(x => x[1])];
  }

  createMultipleUnfoldedOnlyData(arr, attr, usedRange, rangeValModifier) {
    const res = [].concat(...arr.map(c => this.createSingleUnfolded(c, attr, () => undefined, usedRange, rangeValModifier)));
    return res.map(x => x[0]);
  }
}

/**
 * The APIUpdater class is used to provide an easy interface to update PLOD and longevity in
 * the provided GoT API. Initialize it like this:
 * `let updater = await new APIUpdater().init();`
 */
class APIUpdater {
  constructor() {}

  checkDataset(dataset) {
    if (dataset !== 'book' && dataset !== 'show') {
      throw new Error('invalid dataset: ' + dataset);
    }
  }

  async fetchDataset(dataset, endpoint) {
    return JSON.parse(await request.get(config.GOT_API_BASE_URL + `/${dataset}/${endpoint}`));
  }

  getCharacter(dataset, name) {
    this.checkDataset(dataset);
    const c = (dataset === 'book' ? this.bookChars : this.showChars).find(c => c.name === name);
    if (c === undefined || !c.slug) throw new Error(`character with name '${name}' or its slug is missing`);
    return c;
  }

  /**
   * Initialize the APIUpdater class, i.e. fetch and cache the current book and show characters
   * which have their current PLOD and longevity already included.
   */
  async init() {
    [this.bookChars, this.showChars] = await Promise.all([
      this.fetchDataset('book', 'characters'),
      this.fetchDataset('show', 'characters'),
    ]);
    return this;
  }

  /**
   * Update the PLOD and longevity of a character. Before sending any data to the server, everything
   * is validated to ensure that only the correct format is used. Note that this function returns a
   * Promise, which resolves after the API request was successful.
   * @param {string} dataset - The dataset to be updated, i.e. 'book' or 'show'.
   * @param {string} slug - The name of the character to be updated, e.g. 'Jon Snow'. Note that you shall provide the actual character's name here, not its slug.
   * @param {number[]} longevity - The new array of likelihoods of survival, that is numbers between 0 and 1. The numbers correspond to subsequent years.
   * @param {number} longevityStart - The year the `longevity` array starts in.
   * @param {number} plod - The new likelihood of death of the character, that is a number between 0 and 1.
   */
  updatePLODLongevity(dataset, name, longevity, longevityStart, plod) {
    // check the types of all given parameters
    if (
      typeof name !== 'string' ||
      !(longevity instanceof Array) ||
      longevity.filter(x => typeof x !== 'number').length !== 0 ||
      typeof longevityStart !== 'number' ||
      typeof plod !== 'number'
    ) {
      throw new Error('at least one parameter has an invalid type');
    }

    // check the ranges of all given parameters
    this.checkDataset(dataset);
    const c = this.getCharacter(dataset, name);
    const outOfRange = a => a < 0 || a > 1;
    if (longevity.filter(outOfRange).length > 0 || longevityStart < 0 || outOfRange(plod)) {
      throw new Error('at least one parameter is out of range');
    }

    // at this point, everything is okay, so first write the new data to the respective character object
    c.longevityB = longevity;
    c.longevityStartB = longevityStart;
    c.plodB = plod;

    // finally send the POST request to the API server
    return request.post(config.GOT_API_BASE_URL + `/${dataset}/characters/updateGroupB`, {
      json: {
        slug: c.slug,
        longevity,
        longevityStart,
        plod,
        token: 'IgOtAnAcCeSsToKeNN99',
      },
    });
  }

  /**
   * Update Bayesean attributes and their influences
   */

  updateBayeseanAttributes(dataset, attrs) {
    //do a type check

    for (let key of Object.keys(attrs)) {
      if (Number.isNaN(attrs[key])) {
        throw new Error('Attribute values must be numbers!');
      }
    }

    //now send
    return request.post(config.GOT_API_BASE_URL + `/${dataset}/bayesean-attributes/update`, {
      json: {
        attributes: attrs,
        token: 'IgOtAnAcCeSsToKeNN99',
      },
    });
  }

  /**
   * Like `updatePLODLongevity`, but only the PLOD is updated, the longevity is taken from the cache.
   */
  updatePLOD(dataset, name, plod) {
    const c = this.getCharacter(dataset, name);
    return this.updatePLODLongevity(dataset, name, c.longevityB || [], c.longevityStartB || 0, plod);
  }

  /**
   * Like `updatePLODLongevity`, bur only the longevity data is updated, the PLOD is taken from the cache.
   */
  updateLongevity(dataset, name, longevity, longevityStart) {
    const c = this.getCharacter(dataset, name);
    return this.updatePLODLongevity(dataset, name, longevity, longevityStart, c.plodB || 0);
  }
}

module.exports = {
  loadBookData,
  loadShowData,
  loadFormatterMLData,
  loadFormatterShowMLData,
  loadPredictionsBook,
  loadBayeseanPredictionsBook,
  loadPredictionsShow,
  loadBayeseanPredictionsShow,
  writeOutputData,
  writeOutputDataBinary,
  sanitizeString,
  sanitizedCmp,
  createSetFromAttrFunc,
  arrToIndices,
  countAttrValues,
  minAttr,
  maxAttr,
  extremeAttr,
  clamp,
  shuffleArray,
  shuffleTwoArrays,
  writeJSONSetFromAttr,
  JoinedOneHotVector,
  APIUpdater,
};
