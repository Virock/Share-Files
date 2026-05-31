const cookieParser = require("cookie-parser");
const fs = require("fs/promises");
const multer = require('multer')
const upload = multer({dest: process.env.FILES_LOCATION})
const Mysql = require("../../serverGlobals");
require("dotenv").config();

const Router = require("express");
const router = Router();

router.use(Router.json({limit: "50mb"}));
router.use(Router.urlencoded({extended: false, limit: "50mb"}));
router.use(cookieParser());

router.get("/", async function (req, res, next) {
  //Get files in database
  const db = await Mysql.pool.getConnection();
  const data = await db.execute(`SELECT *
                                 FROM File
                                 ORDER BY id DESC`);
  console.log(`data:`, data[0]);
  db.release();
  res.json(data[0]);
});

router.post("/", upload.array("files"), async function (req, res, next) {
  //Simply pass the files to the storage server
  const db = await Mysql.pool.getConnection();
  await db.beginTransaction();
  try {
    for (const entry of req.files)
      await db.execute(`INSERT INTO File (originalname, encoding, mimetype, filename, size)
                        VALUES (?, ?, ?, ?, ?)`, [entry.originalname, entry.encoding, entry.mimetype, entry.filename, entry.size]);
    await db.commit();
    res.status(200).end();
  } catch (e) {
    await db.rollback();
    res.status(400).json({message: `Error occurred while uploading file(s)`});
  } finally {
    db.release();
  }
});

router.delete("/:id", async function (req, res, next) {
  const db = await Mysql.pool.getConnection();
  try {
    const file = await db.execute(`SELECT * FROM File WHERE id = ?`, [req.params.id]);
    if (file[0].length === 0)
      throw new Error("Bad file");
    await fs.unlink(`${process.env.FILES_LOCATION}${file[0][0].filename}`);
    await db.execute(`DELETE FROM File WHERE id = ?`, [req.params.id]);
    res.json({message: "Success"});
  } catch (e) {
    res.status(400).json({message: "Doesn't exist"});
  }
  finally{
    db.release();
  }
});


router.get("/:id", async function (req, res, next) {
  const db = await Mysql.pool.getConnection();
  try {
    const file = await db.execute(`SELECT * FROM File WHERE id = ?`, [req.params.id]);
    if (file[0].length === 0) throw new Error("Bad file");
    res.download(`${process.env.FILES_LOCATION}${file[0][0].filename}`, file[0][0].originalname);
  } catch (e) {
    res.status(400).json({message: "Doesn't exist"});
  }
  finally{
    db.release();
  }
});

router.delete("/", async function (req, res, next) {
  const db = await Mysql.pool.getConnection();
  //Mark all files as deleted
  const files = await db.execute(`SELECT * FROM File`);
  if (files[0].length === 0)
    return res.end();
  for (const file of files[0]) {
    await fs.unlink(`${process.env.FILES_LOCATION}${file.filename}`)
  }
  await db.execute(`DELETE FROM File`);
  db.release();
  res.json({message: "Success"});
});

module.exports = router;
