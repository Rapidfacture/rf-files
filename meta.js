const path = require('path');
const objectId = require('mongoose').Types.ObjectId;
const filesLib = require('./files.js');
let db;
let filesPath = path.join(__dirname, '../../files');

module.exports = {
   start,
   find,
   update,
   remove,
   createJson,
   addVersion,

   getLatestPath,
   getAllPaths
};


function start (database, path) {
   db = database;
   if (path) filesPath = path;
}


function find (fileId, callback) {
   db.global.fileMetas
      .findOne({_id: fileId})
      .exec(callback);
}


function update (meta, opts, callback) {
   if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
   }
   opts = opts || {};
   callback = callback || function () {};

   let updateOpts = {new: true};
   if (opts.upsert) {
      meta._id = meta._id || objectId();
      updateOpts.upsert = true;
   }

   db.global.fileMetas
      .findOneAndUpdate(
         {_id: meta._id},
         meta,
         updateOpts,
         callback);
}


function remove (meta, callback) {
   if (!meta || !meta._id) return callback('no fileId defined');
   db.global.fileMetas
      .remove({_id: meta._id})
      .exec(callback);
}


function createJson (meta, buffer) {
   meta = meta || {};
   meta.section = meta.section || sectionFromApptype(meta.apptype);
   meta._id = meta.fileId || objectId();
   meta.created = new Date();
   meta.filename = meta.filename || '';
   meta.internalFileName = meta._id;
   if (meta.filename) meta.internalFileName += '_' + meta.filename;
   if (buffer) addVersion({}, buffer, meta);
   return meta;
}


function addVersion (version, buffer, meta) {
   version = version || {};
   version._id = objectId();
   version.date = new Date();
   version.size = Buffer.byteLength(buffer);
   version.mimetype = meta.mimetype || 'application/octet-stream';

   meta = meta || {};
   meta.section = meta.section || sectionFromApptype(meta.apptype);
   meta.versions = meta.versions || [];
   meta.size = version.size;
   meta.mimetype = version.mimetype;

   let internalFileName = filesLib.createInternalFileName(meta, version);
   version.path = path.join(filesLib.relativePath(meta.section), internalFileName);
   // further options that can be passed
   // extension
   // mimetype
   // user
   // comment
   // hash
   // locked
   // meta
   meta.versions.push(version);
   return version;
}

// function metaLatestVersion (meta) {
//    meta = meta || {};
//    meta.versions = meta.versions || [];
//    if (!meta.versions[0]) return {};
//    return meta.versions[meta.versions.length - 1];
// }

function sectionFromApptype (apptype) {
   let section = {
      'account': 'accounts',
      'article': 'articles',
      'bill': 'bills',
      'confirmation': 'confirmations',
      'drawing': 'articles',
      'offer': 'offers',
      'invoice': 'invoices',
      'profile': 'profiles',
      'purchase': 'purchases'
   }[apptype];
   return (section || 'other');
}


function getLatestPath (meta, callback) {
   let allPaths = getAllPaths(meta);
   let latest = allPaths[allPaths.length - 1];
   latest = path.join(filesPath, latest);
   if (callback) callback(null, latest);
   return latest;
}


function getAllPaths (meta, callback) {
   meta = meta || {};
   meta.versions = meta.versions || [];
   let allPaths = [];
   meta.versions.forEach(function (version) {
      if (version.path) allPaths.push(version.path);
   });
   if (callback) callback();
   return allPaths;
}
