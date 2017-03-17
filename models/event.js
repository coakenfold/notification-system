const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  url: String
});

module.exports = mongoose.model("Event", eventSchema);
