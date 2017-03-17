const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  eventId: String,
  userEmail: String
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
