const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Masraf ismi gereklidir"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Masraf açıklaması gereklidir"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Masraf tarihi gereklidir"],
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, "Masraf tutarı gereklidir"],
      min: [0, "Masraf tutarı negatif olamaz"],
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

const Expense = mongoose.model("Expense", ExpenseSchema);
module.exports = Expense; 