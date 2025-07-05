const Driver = require("../models/Driver");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all drivers (with company filtering)
const getAllDrivers = async (req, res) => {
  try {
    const { companyId } = req.user;
    
    // Filter drivers by company ID (superadmin can see all)
    const filter = req.user.role === 'superadmin' ? {} : { companyId };
    
    const drivers = await Driver.find(filter).sort('name');
    
    res.status(StatusCodes.OK).json({ drivers });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Şoförler alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single driver
const getDriver = async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const { companyId, role } = req.user;
    
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      throw new CustomError.NotFoundError(`${driverId} ID'li şoför bulunamadı`);
    }
    
    // Check if user has access to this driver
    if (role !== 'superadmin' && driver.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu şoförü görüntüleme yetkiniz yok");
    }
    
    res.status(StatusCodes.OK).json({ driver });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Şoför bilgileri alınırken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Create a driver
const createDriver = async (req, res) => {
  try {
    // Add company ID to the driver data
    req.body.companyId = req.user.companyId;
    
    const driver = await Driver.create(req.body);
    
    res.status(StatusCodes.CREATED).json({ 
      message: "Şoför başarıyla oluşturuldu",
      driver 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Şoför oluşturulurken bir hata oluştu",
      error: error.message
    });
  }
};

// Update a driver
const updateDriver = async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const { companyId, role } = req.user;
    
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      throw new CustomError.NotFoundError(`${driverId} ID'li şoför bulunamadı`);
    }
    
    // Check if user has access to this driver
    if (role !== 'superadmin' && driver.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu şoförü düzenleme yetkiniz yok");
    }
    
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(StatusCodes.OK).json({ 
      message: "Şoför başarıyla güncellendi",
      driver: updatedDriver 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Şoför güncellenirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Delete a driver
const deleteDriver = async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const { companyId, role } = req.user;
    
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      throw new CustomError.NotFoundError(`${driverId} ID'li şoför bulunamadı`);
    }
    
    // Check if user has access to this driver
    if (role !== 'superadmin' && driver.companyId !== companyId) {
      throw new CustomError.UnauthorizedError("Bu şoförü silme yetkiniz yok");
    }
    
    await Driver.findByIdAndDelete(driverId);
    
    res.status(StatusCodes.OK).json({ 
      message: "Şoför başarıyla silindi" 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Şoför silinirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

module.exports = {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
}; 