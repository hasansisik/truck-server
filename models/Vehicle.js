const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    model: { 
      type: String, 
      required: true, 
      trim: true 
    },
    year: { 
      type: Number, 
      required: true 
    },
    licensePlate: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    plateNumber: {
      type: String,
      trim: true
    },
    image: { 
      type: String 
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'maintenance'],
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

VehicleSchema.pre('save', function(next) {
  if (this.licensePlate) {
    this.plateNumber = this.licensePlate;
  }
  next();
});

VehicleSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.licensePlate) {
    update.plateNumber = update.licensePlate;
  }
  next();
});

const Vehicle = mongoose.model("Vehicle", VehicleSchema);
module.exports = Vehicle; 