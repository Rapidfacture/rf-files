/**
 * @version 0.1.0
 * @desc wrapper for read / write access related to mongodb data structure
 *
 * files: [{
 *      fileId: { type: String, required: true },
 *      filename: { type: String, required: false},
 *      extension: { type: String, required: false},
 *      mimetype: { type: String, required: true},
 *      size: { type: String, required: false},
 *      created: { type: Date, required: false },
 *      comment: { type: String, required: false},
 *      description: { type: String, required: false},
 *      type: { type: String, required: false},
 *      meta: { type: Object, required: false}
 *  }],
 *
 * The files are linked with the fileId. The selection of the files (show the
 * user which files belong to a drawing) can all be done with metadata.
 * The files are only fetched when needed.
 * This means that update or delete operations have to be done on the metadata as well as on file system.
 *
 * By design we attache files always to "object.files" and only attache files once to a document.
 * There should be no other files attached to the document to keep the structure simple.
 * If there should be any destinction between the files of one document,
 * it is done with custom attributes in the metadata (e.g. 'type').
 *
 * @example how to include
 *    var dbFiles = require('./server/lib/dbFiles.js');
 *
 */


const log = require('rf-log').customPrefixLogger('[dbFiles]');
const async = require('async');
const AdmZip = require('adm-zip');
const files = require('./index.js');
const metaLib = require('./meta.js');

// libs
const encoding = require('./encoding.js');

module.exports = {

   /** downloadAll: get several files from collection and return file path of folder
    * @example
    * dbFiles.downloadAll({
    *    files: [{fileId: "3s53f55a6s356d8a9e", name: "test.pdf"}],
    *    options: {}
    *    },
    *    function (err, zipAsBuffer) {log.info(err, zipAsBuffer);
    * });
    */
   downloadAll: _downloadAll,


   /** getFile: get single file from specific collection
    * @example
    * dbFiles.getFile({
    *    metaCollection: db.order.orders,
    *    fileId: "3s53f55a6s356d8a9e"
    *    }, function (err, fileContentAsBuffer){
    *       log.info(err, fileContentAsBuffer);
    * });
    */
   getFile: _getFile,



   /** duplicate: dublicate all files from specific collection and return an array with the new fileIds
    * @example
    * dbFiles.duplicate({
    *    metaCollection: db.order.orders,
    *    fileIds: [fileId1, fileId2, ...]
    *    }, function (err, duplicatedFileArray){
    *       log.info(err, duplicatedFileArray);
    * });
    */
   duplicate: _duplicate,



   getFileRaw: _getFileRaw,


   /** saveFile: add file to file system and to meta doc
   * @example
   * dbFiles.saveFile({
   *    metaCollection: db.order.orders,
   *    metaQuery: { '_id': req.data.headers.id },
   *    fileMeta: fileMeta,
   *    buffer: req.originalRequest.body
   * }, res.send);
   */
   saveFile: _saveFile,


   /** removeFile: remove file and its linked metadata
    * @example
    * dbFiles.removeFile({
    *    metaCollection: db.drawing.drawings,
    *    metaQuery: {'files.fileId' : fileId },
    *    fileId: "3s53f55a6s356d8a9e"
    *    },
    *    function (err, info) {log.info(err, info);
    * });
    */
   removeFile: _removeFile

};


function _downloadAll (data, mainCallback) {

   // housekeeping
   if (!data || !data.collection || !data.files) log.error('downloadAll: input parameters missing, aborting.');

   // currently no options defined
   // var options = data.options || {};

   let zip = new AdmZip();


   // add encoded csv buffer to zip
   if (data.csv) {
      data.csv.forEach(function (csv) {
         zip.addFile(csv.filename, encoding.encodeWindows(csv.string));
      });
   }

   // iterate asynchron
   async.map(data.files, function (fileMeta, callback) {
      _getFileRaw({
         fileId: fileMeta.fileId
      }, function (err, file) {
         var filename = fileMeta.filename || 'file.unknown';
         if (err) {
            return callback(err);
         } else if (file) {
            zip.addFile(filename, file);
            callback(null);
         }
      });
   }, function (err, results) {
      mainCallback(err, zip.toBuffer());
   });

}


function _duplicate (data, mainCallback) {
   // housekeeping
   if (!mainCallback) return log.error('getFile: no callback!');
   if (!data.metaCollection || !data.fileIds) return mainCallback('getFile: input parameters missing, aborting.');

   var fileIds = data.fileIds;
   var duplicatedFiles = [];

   async.eachSeries(fileIds, function (fileId, callback) {

      _getFile({
         metaCollection: data.metaCollection,
         fileId: fileId
      }, function (err, buffer, meta) {
         if (err) {
            log.error(err);
            return callback(err);
         }

         delete meta._id;
         delete meta.fileId;
         delete meta.created;

         files.write(meta, buffer, {dontCheckSubCategory: true}, function (err, meta) {
            if (err) {
               log.error(err);
               return callback(err);
            }

            var file = {
               fileId: meta._id,
               filename: meta.filename,
               extension: meta.extension,
               mimetype: meta.mimetype, // Override the mime type with the given one in the header because stream.PassThrough alwas sets octet-stream
               size: meta.size,
               created: meta.created || new Date(),
               category: meta.category || 'other',
               subcategory: meta.subcategory || 'other'
            };
            duplicatedFiles.push(file);

            callback();
         });
      });

   }, function () {
      mainCallback(null, duplicatedFiles);
   });

}


function _getFile (data, mainCallback) {

   // housekeeping
   if (!mainCallback) return log.error('getFile: no callback!');
   if (!data.metaCollection || !data.fileId) return mainCallback('getFile: input parameters missing, aborting.');

   async.waterfall([
      findMeta,
      extractFileMetaData,
      getBinary
   ], mainCallback);

   function findMeta (callback) {
      data.metaCollection
         .findOne({'files.fileId': data.fileId})
         .exec(callback);
   }

   function extractFileMetaData (doc, callback) {
      var fileMeta = {
         filename: 'nofilename.unknown',
         mimetype: 'application/octet-stream'
      };
      if (doc && doc.files) {
         doc.files.forEach(function (file) {
            if (file.fileId === data.fileId) fileMeta = file;
         });
      }

      if (fileMeta.toObject) fileMeta = fileMeta.toObject();

      callback(null, fileMeta);
   }

   function getBinary (fileMeta, callback) {
      _getFileRaw(data, function (err, buffer) {
         callback(err, buffer, fileMeta);
      });
   }
}


function _getFileRaw (data, mainCallback) {
   // housekeeping
   if (!mainCallback) return log.error('getFileRaw: no callback!');
   if (!data) return mainCallback('getFileRaw: argument "data" is missing');
   if (!data.fileId) return mainCallback('getFileRaw: input parameters missing, aborting.');

   files.read(data.fileId, mainCallback);
}


function _saveFile (data, mainCallback) {
   // housekeeping
   if (!mainCallback) return log.error('saveFile: no callback!');
   if (!data) return mainCallback('saveFile: argument "data" is missing');
   let keys = ['metaCollection', 'metaQuery', 'buffer', 'fileMeta'];
   for (var i = 0; i < keys.length; i++) {
      if (!data[keys[i]]) return mainCallback(`saveFile: argument data.${keys[i]} missing, aborting.`);
   }

   data.fileMeta = data.fileMeta || {};
   data.fileMeta.category = data.fileMeta.category || metaLib.categoryFromSubCategory(data.fileMeta.subcategory);

   async.waterfall([
      findMetaDoc,
      saveBinary,
      createFile,
      updateDoc,
      saveDoc
   ], mainCallback);

   function findMetaDoc (callback) {
      data.metaCollection.findOne(data.metaQuery).exec(callback);
   }

   function saveBinary (metaDoc, callback) {
      files.write(data.fileMeta, data.buffer, function (err, fileMeta) {
         if (err) return callback(err);

         callback(null, fileMeta, metaDoc);
      });
   }

   function createFile (fileMeta, metaDoc, callback) {
      var files = [];
      metaDoc.files = metaDoc.files || [];
      files = files.concat(metaDoc.files);


      var file = {
         fileId: fileMeta._id,
         filename: fileMeta.filename,
         extension: data.fileMeta.extension,
         mimetype: data.fileMeta.mimetype, // Override the mime type with the given one in the header because stream.PassThrough alwas sets octet-stream
         size: fileMeta.size,
         created: fileMeta.created,
         category: data.fileMeta.category,
         subcategory: data.fileMeta.subcategory
      };
      files.push(file);
      callback(null, metaDoc, file, files);
   }

   function updateDoc (metaDoc, file, files, callback) {
      if (data.updateDocFunc) {
         data.updateDocFunc(metaDoc, file, files, function (err) {
            callback(err, metaDoc, file, files);
         });
      } else {
         callback(null, metaDoc, file, files);
      }
   }

   function saveDoc (doc, file, files, callback) {
      doc
         .set({files: files})
         .save(callback);
   }
}



function _removeFile (data, mainCallback) {
   // housekeeping
   if (!mainCallback) return log.error('removeFile: no callback!');
   if (!data.metaCollection ||
       !data.metaQuery ||
       !data.fileId) return mainCallback('removeFile: input parameters missing, aborting.');

   async.waterfall([
      findMetaDoc,
      removeBinary,
      saveMetaDoc
   ], mainCallback);

   function findMetaDoc (callback) {
      data.metaCollection
         .findOne(data.metaQuery)
         .exec(callback);
   }

   function removeBinary (metaDoc, callback) {
      files.remove(data.fileId, {}, function (err) {
         callback(err, metaDoc);
      });
   }

   function saveMetaDoc (metaDoc, callback) {
      if (!metaDoc) return callback('metaDoc seams not to exist');

      var files = [];
      files = files.concat(metaDoc.files); // make a copy (no mongoose obj) => be able to work normal with array

      for (var i = 0; i < files.length; i++) {
         if (files[i].fileId === data.fileId) {
            files.splice(i, 1);
         }
      }

      metaDoc.set({files: files});
      metaDoc.save(callback);
   }
}
