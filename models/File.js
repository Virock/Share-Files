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
  size: Number,
  location: [
    {
      name: String
    }
  ],
  deleted: {
    type: Boolean,
    default: false
  },
  deleted_on: [
    {
      name: String
    }
  ]
});
module.exports = mongoose.model("File", fileSchema);
