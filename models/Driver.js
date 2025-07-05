const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema(
  {
    name: { 
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
          // Allow Turkish phone format: optional +90 or 0 prefix followed by 10 digits
          return /^(\+90|0)?[0-9]{10}$/.test(cleanedPhone);
        },
        message: (props) => `${props.value} geçerli bir telefon numarası değil!`,
      },
    },
    license: { 
      type: String, 
      required: true, 
      trim: true 
    },
    experience: { 
      type: Number, 
      required: true 
    },
    avatar: { 
      type: String,
      default: "https://cdn-icons-png.freepik.com/512/8188/8188362.png"
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'onleave'],
        message: '{VALUE} geçerli bir durum değil'
      },
      default: 'active'
    },
    companyId: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", DriverSchema);
module.exports = Driver; 