/** init the database on install
 *
 * @version 0.1.0
 */

// deps
const async = require('async');
// const path = require('path');

// libs
const filesLib = require('./files.js');
const metaLib = require('./meta.js');

// let filesPath = path.join(__dirname, '../../files');

// module functions
module.exports = {
   start,
   read, // get json, get filepath, read file, return buffer + meta
   write, // create filename, create a json document,
   update, //  use same json, create new filename, add another file, save new file in new folder
   remove // remove file, but not json; mark as deleted in version object
};


function start (database, path, callback) {
   callback = callback || function () {};

   // if (path) filesPath = path;

   filesLib.start(path);
   metaLib.start(database, path);
   callback();
}


function read (fileId, callback) {
   metaLib.find(fileId, function (err, meta) {
      if (err) return callback(err);
      if (!meta) return callback('filemeta missing');

      let path = metaLib.getLatestPath(meta);
      filesLib.read(path, callback);
   });
}


function write (meta, buffer, opts, callback) {
   opts = opts || {};
   if (!callback && typeof opts === 'function') callback = opts;

   meta = meta || {};
   if (!meta.apptype && !opts.dontCheckApptype) return callback('apptype missing');
   meta = metaLib.createJson(meta, buffer);
   let path = metaLib.getLatestPath(meta);
   filesLib.ensurePathExistsSync(path);
   filesLib.write(path, buffer, function () {
      metaLib.update(meta, {upsert: true}, callback);
   });
}

// Currently not in use, might be required in case we use real versioning for files
function update (fileId, buffer, mainCallback) {
   let metaData = {};
   async.waterfall([
      async.apply(metaLib.find, fileId),
      function (meta, callback) {
         metaData = meta;
         metaLib.addVersion(meta, buffer);
         callback(null, metaLib.getLatestPath(meta));
      },
      async.apply(filesLib.write, buffer),
      function (info, callback) {
         metaLib.update(metaData, callback);
      }
   ], mainCallback);
}


function remove (fileId, opts, mainCallback) {
   opts = opts || {};
   if (!mainCallback && typeof opts === 'function') mainCallback = opts;
   mainCallback = mainCallback || function () {};

   // remove
   opts.stage = opts.stage || 'recycle';
   switch (opts.stage) {
      case 'recycle':
      // mark json as deleted
         metaLib.update({_id: fileId, deleted: true}, mainCallback);
         break;

      /*
      // currently untested use cases
      // for saving disk space
      case 'oldVersions':
         async.waterFall([
            async.apply(metaLib.find, fileId),
            function (meta, callback) {
               let allPaths = metaLib.getAllPaths(meta);
               if (allPaths.length > 1) {
                  let lastPath = allPaths.splice(allPaths.length - 1, 1);
                  callback(meta, allPaths, lastPath);
               } else {
                  callback('no old versions found');
               }
            },
            function (meta, allPaths, lastPath, callback) {
               async.forEach(allPaths, function (path, cb) {
                  filesLib.remove(path, cb);
               }, function (err, info) {
                  callback(err, meta, lastPath);
               });
            },
            function (meta, lastPath, callback) {
               // TODO: mark old versions in the json as deleted
               meta.versions = meta.versions || [];
               meta.versions.forEach(function (version) {
                  if (version.path !== lastPath) version.deleted = true;
               });
               callback(meta);

            },
            metaLib.update
         ], mainCallback);
         break;


      case 'all':
         async.waterfall([
            async.apply(metaLib.find, fileId),
            function (meta, callback) {
               let allPaths = metaLib.getAllPaths(meta);
               callback(meta, allPaths);
            },
            function (meta, allPaths, callback) {
               async.forEach(allPaths, function (path, cb) {
                  filesLib.remove(path, cb);
               }, callback);
            },
            metaLib.remove
         ], mainCallback);
         break;
      */
   }
}
