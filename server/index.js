const express = require("express");
const mongoose = require("mongoose");
const Router = require("express");
const app = express();
require("dotenv").config();

  app.use(express.json({limit: "50mb"}));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
  mongoose.connection.on("connected", () => console.log("Mongoose Connected"));
  mongoose.connection.on("disconnected", () => console.log("Mongoose Disconnected"));

  mongoose.connect(process.env.DBURL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  });

  async function shutdown(signal, callback) {
    console.log(`${signal} received.`);
    await mongoose.disconnect();
    if (typeof callback === "function") callback();
    else process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.once("SIGUSR2", signal => {
    shutdown(signal, () => process.kill(process.pid, "SIGUSR2"));
  });

module.exports = app;
