//Require Mongoose
var mongoose = require("mongoose");

let fileSchema = new mongoose.Schema({
  fieldname: String,
  originalname: String,
  encoding: String,
  mimetype: String,
  destination: String,
  filename: String,
  path: String,
  size: Number
});
module.exports = mongoose.model("File", fileSchema);
