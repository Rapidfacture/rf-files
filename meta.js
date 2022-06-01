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
   categoryFromSubCategory,

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


function createJson (meta, buffer, opts) {
   meta = meta || {};
   meta.category = meta.category || categoryFromSubCategory(meta.subcategory);
   meta._id = meta.fileId || objectId();
   meta.created = new Date();
   meta.filename = meta.filename || '';
   meta.internalFileName = meta._id;
   if (meta.filename) meta.internalFileName += '_' + meta.filename;
   if (buffer) addVersion({}, buffer, meta, opts);
   return meta;
}


function addVersion (version, buffer, meta, opts) {
   version = version || {};
   version._id = objectId();
   version.date = new Date();
   version.size = Buffer.byteLength(buffer);
   version.mimetype = meta.mimetype || 'application/octet-stream';
   version.extension = meta.extension || meta.filename.split('.').pop();

   meta = meta || {};
   meta.category = meta.category || categoryFromSubCategory(meta.subCategory);
   meta.versions = meta.versions || [];
   meta.size = version.size;
   meta.mimetype = version.mimetype;

   if (opts.objectIdToDate && meta._id) opts.date = objectId(meta._id).getTimestamp();

   version.path = path.join(
      filesLib.relativePath(meta.category, 'month', opts),
      filesLib.createInternalFileName(meta, version)
   );
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

function categoryFromSubCategory (subcategory) {
   let categories = {
      requestCustomer: 'sale',
      offer: 'sale',
      confirmation: 'sale',
      orderCustomer: 'sale',
      otherSale: 'sale',

      offerPurchase: 'purchase',
      confirmationPurchase: 'purchase',
      orderPurchase: 'purchase',
      requestPurchase: 'purchase',
      otherPurchase: 'purchase',

      invoice: 'invoice',
      partialInvoice: 'invoice',
      proformaInvoice: 'invoice',
      firstReminder: 'invoice',
      secondReminder: 'invoice',
      thirdReminder: 'invoice',
      cancellation: 'invoice',
      otherInvoice: 'invoice',

      invoiceIncoming: 'incomingInvoice',
      firstReminderIncoming: 'incomingInvoice',
      secondReminderIncoming: 'incomingInvoice',
      thirdReminderIncoming: 'incomingInvoice',
      cancellationIncoming: 'incomingInvoice',
      otherIncoming: 'incomingInvoice',

      image: 'article',
      drawing: 'article',
      drawing2d: 'article',
      drawing3d: 'article',
      assemblyDesign: 'article',
      dataSheet: 'article',
      billOfMaterials: 'article',
      otherArticle: 'article',

      workplan: 'production',
      cncProgram: 'production',
      clampingPlan: 'production',
      setupPlan: 'production',
      qualityProtocol: 'production',
      serviceProtocol: 'production',
      deliveryNote: 'production',
      shippingLabel: 'production',
      otherProduction: 'production',

      profileImage: 'account',
      logo: 'account',
      presentation: 'account',
      certificate: 'account',
      commercialRegisterExtract: 'account',
      otherAccount: 'account',

      reclamation: 'reclamation',
      otherReclamation: 'reclamation',

      other: 'other'
   }[subcategory];
   return (categories || 'other');
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
