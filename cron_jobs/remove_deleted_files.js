const File = require("../models/File");
require("dotenv").config({path: "../.env"});
const secret = require("../secret");

let running = false;

async function run() {
  if (running)
    return;
  running = true;
  //Delete all files entries where the number of deleted_on elements the number of located on elements
  const files = await File.aggregate([
    {$match: {deleted: true}},
    {
      $addFields: {
        "a": {$size: "$deleted_on"},
        "b": {$size: "$location"}
      }
    },
    {
      $project: {
        a: 1,
        b: 1,
        ab: {$cmp: ["$a", "$b"]}
      }
    },
    {$match: {ab: 0}},
    {$project: {_id: 1}}
  ]);

  // console.log(files);

  const ids = files.map(function (file) { return file._id; });

  await File.deleteMany({"_id": {"$in": ids}});

  running = false;
}

module.exports = {
  run
}
