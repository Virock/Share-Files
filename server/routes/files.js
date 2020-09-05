const {Router} = require("express");
const File = require("../../models/File");
const fs = require("fs");
const secret = require("../../secret");
const multer = require("multer");
require("dotenv").config();
const os = require("os");
const util = require("util");
const mv = require("mv");
const fs_rename_file = util.promisify(mv);
const promisified_fs_unlink = util.promisify(fs.unlink);
const upload = multer({
  dest: os.tmpdir(),
  limits: {fieldSize: 25 * 1024 * 1024 * 1024}
});
const NodeSSH = require('node-ssh').NodeSSH;


const router = Router();

router.post("/", upload.array("files"), async function (req, res, next) {
  //Check if at least one file was uploaded
  //If not, return error
  if (!req.files || req.files.length < 1) {
    res.status(400);
    res.json({error: "No file was uploaded"});
  }
  //If at least one file was uploaded
  else {
    let promises = [];
    const files_to_add_to_database = [];
    //Move files to file system
    for (let i = 0; i < req.files.length; i++) {
      const move_files_promise = fs_rename_file(
        req.files[i].path,
        `${process.env.FILE_STORAGE_LOCATION}${req.files[i].filename}`
      ).catch(function (err) {
        console.log(err)
      });
      promises.push(move_files_promise);
      //Add file to database
      req.files[i].location = [{name: os.hostname()}];
      files_to_add_to_database.push(req.files[i]);
    }
    promises.push(File.create(files_to_add_to_database));
    await Promise.all(promises);
    //Return success message
    promises = [];
    //Loop through servers, if this server is not us, copy this file into it
    for (let i = 0; i < secret.servers.length; i++) {
      if (secret.servers[i].name != os.hostname()) {
        promises.push(copyFileIntoServer(secret.servers[i], req.files));
      }
    }
    await Promise.all(promises);
    res.json({message: "Success"});
  }
});

async function copyFileIntoServer(server, files) {
  const ssh = new NodeSSH()
  await ssh.connect({
    host: server.ip,
    username: server.username,
    password: server.password
  });
  for (let i = 0; i < files.length; i++) {
    await ssh.putFile(`${process.env.FILE_STORAGE_LOCATION}${files[i].filename}`, `/home/Share-Files/user_data/${files[i].filename}`)
      .then(async function () {
        //If successful, add this hostname to database
        await File.findOneAndUpdate({filename: files[i].filename}, {"$push": {location: {name: server.name}}})
      })
      .catch(function () {

      });
  }
  await ssh.dispose();
}

router.delete("/:id", async function (req, res, next) {
  const file = await File.findById(req.params.id);
  //Delete this file from file system and database
  const delete_file_promise = promisified_fs_unlink(
    `${process.env.FILE_STORAGE_LOCATION}${file.filename}`
  );
  const delete_file_from_database_promise = File.findByIdAndUpdate(file._id,
    {
      "$push": {deleted_on: {name: os.hostname()}},
      deleted: true
    });
  const promises = [delete_file_promise, delete_file_from_database_promise];
  for (let i = 0; i < secret.servers.length; i++) {
    if (secret.servers[i].name != os.hostname()) {
      promises.push(deleteFileFromServer(secret.servers[i], file.filename));
    }
  }
  await Promise.all(promises);
  res.json({message: "Success"});
});

async function deleteFileFromServer(server, filename) {
  const ssh = new NodeSSH()
  await ssh.connect({
    host: server.ip,
    username: server.username,
    password: server.password
  });
  await ssh.execCommand("rm " + filename, {cwd: '/home/Share-Files/user_data'})
    .then(async function(){
      await File.findOneAndUpdate({filename: filename},
        {
          "$push": {deleted_on: {name: server.name}},
          deleted: true
        });
    })
    .catch(function(){

    });
  await ssh.dispose();
}

router.get("/:id", async function (req, res, next) {
  const file = await File.findById(req.params.id);
  res.download(`${process.env.FILE_STORAGE_LOCATION}${file.filename}`, file.originalname);
});

router.get("/", async function (req, res, next) {
  //Get files in database
  const data = await File.find({deleted: false});
  res.json(data);
});

module.exports = router;
