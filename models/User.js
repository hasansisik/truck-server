const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const AddressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, trim: true, default: "Turkey" },
});

const AuthSchema = new mongoose.Schema({
  password: { type: String, required: true, select: false },
  verificationCode: { type: Number},
  passwordToken: { type: String, select: false },
  passwordTokenExpirationDate: { type: Date, select: false },
});

const ProfileSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    validate: {
      validator: function (v) {
        return /^(\+90|0)?5\d{9}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  }
});

// Driver specific fields
const DriverInfoSchema = new mongoose.Schema({
  license: { 
    type: String, 
    trim: true 
  },
  experience: { 
    type: Number
  },
  isDriver: {
    type: Boolean,
    default: false
  }
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { 
      type: String, 
      required: true,
      unique: true, 
      trim: true
    },

    role: { type: String, enum: ["superadmin", "admin", "driver"], default: "driver" },
    isVerified: { type: Boolean, default: false },
    address: AddressSchema, // Adres alt şeması
    auth: AuthSchema, // Kimlik doğrulama alt şeması
    profile: ProfileSchema, // Profil bilgileri alt şeması
    driverInfo: DriverInfoSchema, // Şoför bilgileri alt şeması
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
      required: true,
      default: "default" // Default company ID for existing users
    }
  },
  { timestamps: true }
);

// Şifreyi hashleme işlemi
AuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre karşılaştırma metodu
AuthSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;