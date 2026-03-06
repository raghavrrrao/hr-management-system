// models/Settings.js
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    officeLat: Number,
    officeLng: Number
});

module.exports = mongoose.model("Settings", settingsSchema);