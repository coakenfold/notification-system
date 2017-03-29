const mongoose = require('mongoose');

const userSpotifySchema = new mongoose.Schema({
  id: String,
  username: String,
  displayName: String,
  profileUrl: String,
  photos: Array,
  emails: Array
});

module.exports = mongoose.model("UserSpotify", userSpotifySchema);
