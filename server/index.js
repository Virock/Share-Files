const express = require("express");
const consola = require("consola");
const mongoose = require("mongoose");
const { Nuxt, Builder } = require("nuxt");
const app = express();
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

  app.use(express.json());

  mongoose.connection.on("connected", () =>
    console.log("Mongoose connected")
  );
  mongoose.connection.on("disconnected", () =>
    console.log("Mongoose disconnected")
  );
  mongoose.connect(process.env.DBURL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
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
