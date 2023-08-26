const File = require("../../models/File");
require("dotenv").config();
const request = require("request").defaults({rejectUnauthorized: false});

const axios = require("axios");
const {once} = require("events");

const Router = require("express");
const express = require("express");
const router = Router();

router.use(express.json({limit: "50mb"}));

router.post("/", async function (req, res, next) {
  //Simply pass the files to the storage server
  try {
    let responseBody = "";
    const newHeaders = {};
    newHeaders.accept = req.headers[`accept`];
    newHeaders["authorization"] = `Bearer ${process.env.PASSWORD}`;
    newHeaders[`content-type`] = req.headers[`content-type`];
    newHeaders[`content-length`] = req.headers[`content-length`];
    const upload = req.pipe(request({
      method: "POST",
      uri: process.env.STORAGE_URL,
      gzip: true,
      headers: newHeaders // Send Same Content-Type, Length and so on
    }, (error, response, body) => {
      responseBody = JSON.parse(body);
    }));

    await once(upload, 'end').catch(function (err) {
      res.status(400).end();
    })
    // check status code if you want
    let statusCode = 400;
    const success = upload.response.statusCode === 200;
    //If success
    if (success) {
      //Store in database
      statusCode = 200;
      await File.insertMany(responseBody);
    }
    res.status(statusCode).end();
  } catch (e) {
    res.status(400).json({message: `Error occurred while uploading file(s)`});
  }
});

router.delete("/:id", async function (req, res, next) {
  let errorOccurred = false;
  const file = await File.findById(req.params.id).catch(function (err) {
    res.json({message: "Doesn't exist"});
    errorOccurred = true;
  });
  if (errorOccurred)
    return;
  // Make request to server to delete file
  // If server deletes file, remove from database
  const headers = {authorization: `Bearer ${process.env.PASSWORD}`};
  await axios.delete(`${process.env.STORAGE_URL}/${file.filename}`, {headers}).catch(function (err) {
    console.error(err);
    errorOccurred = true;
  });
  if (errorOccurred) {
    res.status(400).end();
    return;
  }
  await File.deleteOne({_id: req.params.id});
  res.json({message: "Success"});
});


router.get("/:id", async function (req, res, next) {
  let errorOccurred = false;
  const file = await File.findById(req.params.id).catch(function (err) {
    res.json({message: "Doesn't exist"});
    errorOccurred = true;
  });
  if (errorOccurred)
    return;
  const headers = {authorization: `Bearer ${process.env.PASSWORD}`};
  const response = await axios.get(`${process.env.STORAGE_URL}/${file.filename}/${file.originalname}`, {
    responseType: "stream",
    headers
  })
    .catch(function (err) {
      errorOccurred = true;
    })
  if (errorOccurred) {
    res.status(400).end();
    return;
  }
  res.writeHead(response.status, response.headers);
  response.data.pipe(res);
});

router.get("/", async function (req, res, next) {
  //Get files in database
  const data = await File.find().sort({"$natural": -1});
  res.json(data);
});

router.delete("/", async function (req, res, next) {
  //Mark all files as deleted
  const files = await File.find({});
  if (files.length == 0)
    return;
  const dataToSend = [];
  files.forEach(function (file) {
    dataToSend.push({fileName: file.filename});
  })
  let errorOccurred = false;
  const headers = {authorization: `Bearer ${process.env.PASSWORD}`};
  await axios.delete(process.env.STORAGE_URL, {headers, data: {files: dataToSend}})
    .catch(function (err) {
      errorOccurred = true;
    })
  if (errorOccurred) {
    res.status(400).end();
    return;
  }
  await File.deleteMany({});
  res.json({message: "Success"});
});

module.exports = router;
