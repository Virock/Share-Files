const express = require("express");
const consola = require("consola");
const mongoose = require("mongoose");
const { Nuxt, Builder } = require("nuxt");
const app = express();
const CronJob = require("cron").CronJob;
const get_missing_files = require("../cron_jobs/get_missing_files");
const delete_files = require("../cron_jobs/delete_files");
const remove_deleted_files = require("../cron_jobs/remove_deleted_files");
require("dotenv").config();

// Import and Set Nuxt.js options
const config = require("../nuxt.config.js");
config.dev = process.env.NODE_ENV !== "production";

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config);

  const { host, port } = nuxt.options.server;

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt);
    await builder.build();
  } else {
    await nuxt.ready();
  }

  //Every day at midnight
  const jobs = new CronJob("0 0 0 * * *", async function() {
    await get_missing_files.run();
    await delete_files.run();
    await remove_deleted_files.run();
  });

  jobs.start();

  app.use(express.json({limit: "50mb"}));

  mongoose.connection.on("connected", () =>
    console.log("Mongoose connected")
  );
  mongoose.connection.on("disconnected", () =>
    console.log("Mongoose disconnected")
  );
  mongoose.connect(process.env.DBURL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    replicaSet: "Virock-ReplicaSet"
  });

  const fileRouter = require("./routes/files");
  app.use("/api/files", fileRouter);

  // Give nuxt middleware to express
  app.use(nuxt.render);

  // Listen the server
  app.listen(process.env.PORT);
  consola.ready({
    message: `Server listening on http://${process.env.HOST}:${process.env.PORT}`,
    badge: true
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
}
start();
