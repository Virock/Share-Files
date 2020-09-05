const File = require("../models/File");
const os = require("os");
require("dotenv").config({path: "../.env"});
const util = require("util");
const fs = require("fs");
const promisified_fs_unlink = util.promisify(fs.unlink);

let running = false;

async function run() {
  if (running)
    return;
  running = true;
  //Check the database for files that are deleted but are on this server
  //Get 100 of them
  const files = await File.find({"deleted_on.name": {"$ne": os.hostname()}}).limit(100);
  //When gotten, delete the file and if successful, update the database that we have deleted it
  for (const file of files) {
    await promisified_fs_unlink(`${process.env.FILE_STORAGE_LOCATION}${file.filename}`)
      .then(function () {
        File.findOneAndUpdate({filename: file.filename}, {"$push": {deleted_on: {name: os.hostname()}}})
      })
  }
  running = false;
}

module.exports = {
  run
}
