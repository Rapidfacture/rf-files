/**
 * @version 0.0.1
 * @desc Encode strings with different encodings
 *
 * @example how to include
 * const encoding = require('./encoding.js');
 *
 */

const singlebyte = require('single-byte');
const log = require('rf-log').customPrefixLogger('[encoding]');

module.exports = {
   encodeWindows: _encodeWindows,
   decodeWindows: _decodeWindows
};

function _encodeWindows (text) {
   try {
      return singlebyte.encode('windows-1258', text);
   } catch (e) {
      log.error('error when encoding the text: ' + e);
   }
}

function _decodeWindows (text) {
   try {
      return singlebyte.decode('windows-1258', text);
   } catch (e) {
      log.error('error when encoding the text: ' + e);
   }
}
