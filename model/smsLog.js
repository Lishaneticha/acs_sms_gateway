const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema({
  phone: { type: String, default: null },
  message: { type: String, default: null },
  status: { type: Number, default: null },
  created_at: { type : Date, default: Date.now },
  retry_at: { type: Date, default: null }
});

module.exports = mongoose.model("smsLog", smsLogSchema);
