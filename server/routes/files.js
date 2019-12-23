const { Router } = require("express");
const File = require("../../models/File");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();
const os = require("os");
const util = require("util");
const mv = require("mv");
const fs_rename_file = util.promisify(mv);
const promisified_fs_unlink = util.promisify(fs.unlink);
const upload = multer({
  dest: os.tmpdir(),
  limits: { fieldSize: 25 * 1024 * 1024 * 1024 }
});

const router = Router();

router.post("/", upload.array("files"), async function(req, res, next) {
  //Check if at least one file was uploaded
  //If not, return error
  if (!req.files || req.files.length < 1) {
    res.status(400);
    res.json({ error: "No file was uploaded" });
  }
  //If at least one file was uploaded
  else {
    const promises = [];
    const files_to_add_to_database = [];
    //Move files to file system
    for (let i = 0; i < req.files.length; i++) {
      const move_files_promise = fs_rename_file(
        req.files[i].path,
        `${process.env.FILE_STORAGE_LOCATION}\\${req.files[i].filename}`
      ).catch(function(err){console.log(err)});
      promises.push(move_files_promise);
      //Add file to database
      files_to_add_to_database.push(req.files[i]);
    }
    promises.push(File.create(files_to_add_to_database));
    await Promise.all(promises);
    //Return success message
    res.json({ message: "Success" });
  }
});

router.delete("/:id", async function(req, res, next) {
  const file = await File.findById(req.params.id);
  //Delete this file from file system and database
  const delete_file_promise = promisified_fs_unlink(
    `${process.env.FILE_STORAGE_LOCATION}\\${file.filename}`
  );
  const delete_file_from_database_promise = file.remove();
  const promises = [delete_file_promise, delete_file_from_database_promise];
  await Promise.all(promises);
  res.json({ message: "Success" });
});

router.get("/:id", async function(req, res, next) {
  const file = await File.findById(req.params.id);
  res.download(`${process.env.FILE_STORAGE_LOCATION}\\${file.filename}`, file.originalname);
});

router.get("/", async function(req, res, next) {
  //Get files in database
  const data = await File.find({});
  res.json(data);
});

module.exports = router;
