const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    address: { 
      type: String, 
      required: true, 
      trim: true 
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Remove all spaces, dashes, and parentheses before validation
          const cleanedPhone = v.replace(/[\s\-()]/g, '');
          // Allow Turkish phone format with spaces, dashes, etc.
          return /^(\+90|0)?[0-9]{10}$/.test(cleanedPhone);
        },
        message: (props) => `${props.value} geçerli bir telefon numarası değil!`,
      },
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Lütfen geçerli bir e-posta adresi girin'],
    },
    logo: { 
      type: String 
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} geçerli bir durum değil'
      },
      default: 'active'
    }
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", CompanySchema);
module.exports = Company; 