const File = require("../models/File");
const os = require("os");
require("dotenv").config({path: "../.env"});
const NodeSSH = require('node-ssh').NodeSSH;
const secret = require("../secret");

let running = false;

async function getFilesFromServer(files) {
  for (const file of files) {
    for (const server_detail of file.location) {
      const server_name = server_detail.name;
      let server = null;
      for (const individual_server of secret.servers) {
        if (individual_server.name == server_name) {
          server = individual_server;
          break;
        }
      }
      const ssh = new NodeSSH()
      await ssh.connect({
        host: server.ip,
        username: server.username,
        password: server.password
      });
      let did_error_occur = false;
      await ssh.getFile(`${process.env.FILE_STORAGE_LOCATION}${file.filename}`, `${process.env.FILE_STORAGE_LOCATION}${file.filename}`)
        .then(async function () {
          await File.findByIdAndUpdate(file._id, {"$push": {location: {name: os.hostname()}}})
        })
        .catch(function () {
          did_error_occur = true;
        });
      await ssh.dispose();
      //If file was downloaded, break
      if (!did_error_occur)
        break;
    }
  }
}

async function run() {
  if (running)
    return;
  running = true;
  //Check the database for files that are not in this server
  //Get 100 of them
  const files = await File.find({deleted: false, "location.name": {"$ne": os.hostname()}}).limit(100);
  //Try to get those files from the servers where they are present
  //When gotten, update database saying that we have the file
  await getFilesFromServer(files);
  running = false;
}

module.exports = {
  run
}
