const mongoose = require("mongoose");

const TowSchema = new mongoose.Schema(
  {
    towTruck: {
      type: String,
      required: [true, "Çeken araç bilgisi gereklidir"],
      trim: true,
    },
    driver: {
      type: String,
      required: [true, "Şoför bilgisi gereklidir"],
      trim: true,
    },
    licensePlate: {
      type: String,
      required: [true, "Çekilen araç plakası gereklidir"],
      trim: true,
    },
    towDate: {
      type: Date,
      required: [true, "Çekilme tarihi gereklidir"],
      default: Date.now,
    },
    distance: {
      type: Number,
      required: [true, "Gidilen mesafe gereklidir"],
    },
    company: {
      type: String,
      required: [true, "Firma bilgisi gereklidir"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    companyId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Tow = mongoose.model("Tow", TowSchema);
module.exports = Tow; 