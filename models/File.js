//Require Mongoose
var mongoose = require("mongoose");

let fileSchema = new mongoose.Schema({
  originalname: String,
  encoding: String,
  mimetype: String,
  filename: String,
  size: Number,
});
module.exports = mongoose.model("File", fileSchema);
