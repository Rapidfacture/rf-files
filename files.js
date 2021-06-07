let mainPrefix = '';
const path = require('path');
const fs = require('fs');
let filesPath = path.join(__dirname, '../../files');
const moment = require('moment');

module.exports = {
   start,

   createInternalFileName,
   currentPath,
   currentFilesPath,
   ensurePathExistsSync,
   getCurrentTime,
   relativePath,

   read: fs.readFile, //   (path, callback)
   remove: fs.unlink, //   (path, callback)
   write: fs.writeFile // (path, buffer, callback)
};

function start (path) {
   if (path) filesPath = path;
}

function createInternalFileName (meta, version) {
   var internalFileName = meta.subcategory;
   internalFileName += '_' + version._id;
   if (meta.filename) internalFileName += '_' + meta.filename.replace(/[/\\?%*:|"<>]/g, '-');

   return internalFileName;
}


function currentPath (section, granularity) {
   section = section || 'other';
   granularity = granularity || 'month';
   let subfolder = '';

   // get week or month
   subfolder = getCurrentTime(granularity);

   //                    files/volume1/       2018/            invoices/  51
   return path.join(currentFilesPath(), getCurrentTime('year'), section, subfolder);
}


function currentFilesPath () {
   return path.join(filesPath, mainPrefix);
}

function relativePath (section, granularity, opts) {
   opts = opts || {};
   section = section || 'other';
   granularity = granularity || 'month';

   // get week or month
   let subfolder = getCurrentTime(granularity, opts);
   let year = getCurrentTime('year', opts);

   //                    files/volume1/       2018/            invoices/  51
   return path.join(year, section, subfolder);
}


function ensurePathExistsSync (filesP) {
   var pathName = path.dirname(filesP);
   if (!fs.existsSync(pathName)) fs.mkdirSync(pathName, { recursive: true });
}


function getCurrentTime (type, opts) {
   type = type || 'year';
   opts = opts || {};

   var date = opts.date || new Date();

   switch (type) {
      case 'year':
         return moment(date).format('YYYY');
      case 'month':
         return moment(date).format('MMMM');
      case 'week':
         return moment(date).format('W');
   }
}
