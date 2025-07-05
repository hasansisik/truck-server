const Company = require("../models/Company");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all companies (with role-based filtering)
const getAllCompanies = async (req, res) => {
  try {
    // Only superadmin can see all companies
    // Admin and regular users can only see their own company
    const companies = req.user.role === 'superadmin' 
      ? await Company.find({}).sort('name')
      : await Company.find({ _id: req.user.companyId });
    
    res.status(StatusCodes.OK).json({ companies });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Firmalar alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single company
const getCompany = async (req, res) => {
  try {
    const { id: companyId } = req.params;
    const { role } = req.user;
    
    // Check if user has access to this company
    if (role !== 'superadmin' && companyId !== req.user.companyId) {
      throw new CustomError.UnauthorizedError("Bu firmayı görüntüleme yetkiniz yok");
    }
    
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new CustomError.NotFoundError(`${companyId} ID'li firma bulunamadı`);
    }
    
    res.status(StatusCodes.OK).json({ company });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Firma bilgileri alınırken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Create a company (SuperAdmin only)
const createCompany = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      throw new CustomError.UnauthorizedError("Sadece superadmin firma oluşturabilir");
    }
    
    const company = await Company.create(req.body);
    
    res.status(StatusCodes.CREATED).json({ 
      message: "Firma başarıyla oluşturuldu",
      company 
    });
  } catch (error) {
    if (error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Firma oluşturulurken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Update a company
const updateCompany = async (req, res) => {
  try {
    const { id: companyId } = req.params;
    const { role } = req.user;
    
    // Check permissions
    if (role !== 'superadmin' && companyId !== req.user.companyId) {
      throw new CustomError.UnauthorizedError("Bu firmayı düzenleme yetkiniz yok");
    }
    
    // If not superadmin, restrict what can be updated
    if (role !== 'superadmin') {
      const allowedFields = ['phone', 'address', 'email'];
      Object.keys(req.body).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete req.body[key];
        }
      });
    }
    
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new CustomError.NotFoundError(`${companyId} ID'li firma bulunamadı`);
    }
    
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(StatusCodes.OK).json({ 
      message: "Firma başarıyla güncellendi",
      company: updatedCompany 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Firma güncellenirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

// Delete a company (SuperAdmin only)
const deleteCompany = async (req, res) => {
  try {
    const { id: companyId } = req.params;
    
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      throw new CustomError.UnauthorizedError("Sadece superadmin firma silebilir");
    }
    
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new CustomError.NotFoundError(`${companyId} ID'li firma bulunamadı`);
    }
    
    await Company.findByIdAndDelete(companyId);
    
    res.status(StatusCodes.OK).json({ 
      message: "Firma başarıyla silindi" 
    });
  } catch (error) {
    if (error instanceof CustomError.NotFoundError || 
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Firma silinirken bir hata oluştu",
        error: error.message
      });
    }
  }
};

module.exports = {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
}; 