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

   read: fs.readFile, //   (path, callback)
   remove: fs.unlink, //   (path, callback)
   write: fs.writeFile // (path, buffer, callback)
};

function start (path) {
   if (path) filesPath = path;
}

function createInternalFileName (meta, version) {
   let internalFileName = version._id;
   if (meta.filename) internalFileName += '_' + meta.filename;
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


function ensurePathExistsSync (filesP) {
   var pathName = path.dirname(filesP);
   if (!fs.existsSync(pathName)) fs.mkdirSync(pathName, { recursive: true });
}


function getCurrentTime (type) {
   type = type || 'year';
   switch (type) {
      case 'year':
         return moment().format('YYYY');
      case 'month':
         return moment().format('MMMM');
      case 'week':
         return moment().format('W');
   }
}
