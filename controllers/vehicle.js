const Vehicle = require("../models/Vehicle");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all vehicles (with company filtering)
const getAllVehicles = async (req, res) => {
  try {
    const { companyId } = req.user;
    
    // Filter vehicles by company ID (superadmin can see all)
    const filter = req.user.role === 'superadmin' ? {} : { companyId };
    
    const vehicles = await Vehicle.find(filter).sort('createdAt');
    
    res.status(StatusCodes.OK).json({ vehicles });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Araçlar alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single vehicle
const getVehicle = async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const { companyId, role } = req.user;
    
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      throw new CustomError.NotFoundError(`${vehicleId} ID'li araç bulunamadı`);
    }
    
    // Check if user has access to this vehicle
    if (role !== 'superadmin' && vehicle.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu aracı görüntüleme yetkiniz yok");
    }
    
    res.status(StatusCodes.OK).json({ vehicle });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Araç bilgileri alınırken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Create a vehicle
const createVehicle = async (req, res) => {
  try {
    // Add company ID to the vehicle data
    req.body.companyId = req.user.companyId;
    
    // Ensure plateNumber is set from licensePlate for backward compatibility
    if (req.body.licensePlate) {
      req.body.plateNumber = req.body.licensePlate;
    }
    
    const vehicle = await Vehicle.create(req.body);
    
    res.status(StatusCodes.CREATED).json({ 
      message: "Araç başarıyla oluşturuldu",
      vehicle 
    });
  } catch (error) {
    console.error("Vehicle creation error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Araç oluşturulurken bir hata oluştu",
      error: error.message
    });
  }
};

// Update a vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const { companyId, role } = req.user;
    
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      throw new CustomError.NotFoundError(`${vehicleId} ID'li araç bulunamadı`);
    }
    
    // Check if user has access to this vehicle
    if (role !== 'superadmin' && vehicle.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu aracı düzenleme yetkiniz yok");
    }
    
    // Ensure plateNumber is set from licensePlate for backward compatibility
    if (req.body.licensePlate) {
      req.body.plateNumber = req.body.licensePlate;
    }
    
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(StatusCodes.OK).json({ 
      message: "Araç başarıyla güncellendi",
      vehicle: updatedVehicle 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      console.error("Vehicle update error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Araç güncellenirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Delete a vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const { companyId, role } = req.user;
    
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      throw new CustomError.NotFoundError(`${vehicleId} ID'li araç bulunamadı`);
    }
    
    // Check if user has access to this vehicle
    if (role !== 'superadmin' && vehicle.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu aracı silme yetkiniz yok");
    }
    
    await Vehicle.findByIdAndDelete(vehicleId);
    
    res.status(StatusCodes.OK).json({ 
      message: "Araç başarıyla silindi" 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Araç silinirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

module.exports = {
  getAllVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}; 