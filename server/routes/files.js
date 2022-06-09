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
const axios = require("axios");


const router = Router();

router.post("/", async function (req, res, next) {
  req.socket.setTimeout(10 * 60 * 1000); //10 minutes timeout
  upload.array("files");
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
    //On upload, place file on only this server
    // promises = [];
    // //Loop through servers, if this server is not us, copy this file into it
    // for (let i = 0; i < secret.servers.length; i++) {
    //   if (secret.servers[i].name != os.hostname()) {
    //     promises.push(copyFileIntoServer(secret.servers[i], req.files));
    //   }
    // }
    // await Promise.all(promises);
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
  if (file.deleted)
  {
    res.json({message: "Doesn't exist"});
    return;
  }
  await File.findByIdAndUpdate(file._id,
    {
      deleted: true
    });
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
  //If file is on me give to client normally
  //If file is located on me and not deleted
  let file_located_on_me = false;
  if (file.deleted)
  {
    res.status(404).json({message: "File has been deleted"});
    return;
  }
  for (let i = 0; i < file.location.length; i++)
  {
    const this_location = file.location[i];
    if (this_location.name === os.hostname())
    {
      file_located_on_me = true;
      break;
    }
  }
  if (file_located_on_me)
    res.download(`${process.env.FILE_STORAGE_LOCATION}${file.filename}`, file.originalname);
  else
  {
    let bad_server = false;
    //Handle situation where the only server that has the file is unavailable
    //Handle situation where the first server with this file has failed
    //If file is on a different server, get from server
    let server_with_file;
    let end_loop = false;
    //Loop through servers with this file
    for (let i = 0; i < file.location.length; i++) {
      if (end_loop)
        break;

      for (let j = 0; j < secret.servers.length; j++) {
        if (end_loop)
          break;
        //Get details about this server
        if (file.location[i].name === secret.servers[j].name) {
          server_with_file = secret.servers[j];
          const url = `${server_with_file.url}/api/files/${req.params.id}`;
          //Try to get a stream of this file
          const response = await axios.get(url, {responseType: "stream"})
            .catch(function (err) {
              //If server is unavailable, store bit
              bad_server = true;
            });
          if (bad_server) {
            //If this is the last server in list, return error
            if (i == file.location.length - 1) {
              res.end(`The server with this file is unavailable. Please try again later`);
              end_loop = true;
              break;
            }
            bad_server = false;
            continue;
          }
          //If server in list has the file, stream to user
          res.writeHead(response.status, response.headers);
          response.data.pipe(res);
          end_loop = true;
          break;
        }
      }
    }

  }

});

router.get("/", async function (req, res, next) {
  //Get files in database
  const data = await File.find({deleted: false}).sort({"$natural": -1});
  res.json(data);
});

router.delete("/", async function (req, res, next) {
  //Mark all files as deleted
  await File.updateMany({deleted: false}, {"$set": {deleted: true}})
  res.json({message: "Success"});
});

module.exports = router;
