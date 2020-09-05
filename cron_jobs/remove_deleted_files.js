const File = require("../models/File");
require("dotenv").config({path: "../.env"});
const secret = require("../secret");

let running = false;

async function run() {
  if (running)
    return;
  running = true;
  //Delete all files entries where the number of deleted_on elements equals servers count
  await File.deleteMany({deleted_on: {"$size": secret.servers.length}});
  running = false;
}

module.exports = {
  run
}
