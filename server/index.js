const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
let Mysql = require("../serverGlobals");
const fs = require("fs");
const fsPromises = require("fs/promises");
let connection;
require("dotenv").config();

async function shutdown(signal, callback) {
  console.log(`${signal} received.`);
  Mysql.pool.end();
  if (typeof callback === "function") callback();
  else process.exit(0);
}

async function main() {

  app.use(express.json({limit: "50mb"}));
  app.use(express.urlencoded({extended: false, limit: "50mb"}));

  connection = await mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });
  await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} COLLATE utf8mb4_unicode_ci`);
  await connection.destroy();

  const migrationPool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const db = await migrationPool.getConnection();
  const migrations = await db.query(`SELECT TABLE_NAME
                                     FROM INFORMATION_SCHEMA.TABLES
                                     WHERE TABLE_NAME = 'Migration'
                                       AND TABLE_SCHEMA = '${process.env.DB_NAME}';`);
  console.log("migrations:", migrations[0].length);
  if (migrations[0].length === 0) {
    await db.query(`
    -- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: May 31, 2026 at 07:24 AM
-- Server version: 8.0.43
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: \`Share_Files\`
--

-- --------------------------------------------------------

--
-- Table structure for table \`File\`
--

CREATE TABLE \`File\` (
  \`id\` int NOT NULL,
  \`originalname\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`encoding\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`mimetype\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`filename\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`size\` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table \`File\`
--
ALTER TABLE \`File\`
  ADD PRIMARY KEY (\`id\`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table \`File\`
--
ALTER TABLE \`File\`
  MODIFY \`id\` int NOT NULL AUTO_INCREMENT;

  CREATE TABLE Migration(
 id int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE Migration
  ADD PRIMARY KEY (id);

  INSERT INTO Migration (id) VALUES (1);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

    `)
  }
  db.release();
  migrationPool.end();

  Mysql.setupConnection();

  let folderExists = true;
  try {
    await fsPromises.access(process.env.FILES_LOCATION, fs.constants.F_OK)
  } catch (ex) {
    folderExists = false;
  }
  if (!folderExists)
    await fsPromises.mkdir(process.env.FILES_LOCATION, 0o744)

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.once("SIGUSR2", signal => {
    shutdown(signal, () => process.kill(process.pid, "SIGUSR2"));
  });
}

main();

module.exports = app;
