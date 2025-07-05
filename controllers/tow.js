const Tow = require("../models/Tow");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all tows for the user's company
const getAllTows = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    const tows = await Tow.find({ companyId: user.companyId });
    
    res.status(StatusCodes.OK).json({ tows });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kayıtları alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single tow
const getTow = async (req, res) => {
  try {
    const { id: towId } = req.params;
    const user = await User.findById(req.user.userId);
    
    const tow = await Tow.findOne({ _id: towId, companyId: user.companyId });
    
    if (!tow) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Çekme kaydı bulunamadı" 
      });
    }
    
    res.status(StatusCodes.OK).json({ tow });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kaydı alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Create a tow
const createTow = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const towData = {
      ...req.body,
      userId: req.user.userId,
      companyId: user.companyId
    };
    
    const tow = await Tow.create(towData);
    
    res.status(StatusCodes.CREATED).json({ 
      message: "Çekme kaydı başarıyla oluşturuldu",
      tow 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kaydı oluşturulurken bir hata oluştu",
      error: error.message
    });
  }
};

// Update a tow - Only admin and superadmin can update
const updateTow = async (req, res) => {
  try {
    const { id: towId } = req.params;
    const user = await User.findById(req.user.userId);
    
    // Check if user has permission to update
    if (user.role === 'user') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi yapmak için yetkiniz yok. Sadece admin ve superadmin güncelleyebilir." 
      });
    }
    
    const tow = await Tow.findOne({ _id: towId, companyId: user.companyId });
    
    if (!tow) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Çekme kaydı bulunamadı" 
      });
    }
    
    // Superadmin can update any tow
    // Admin can only update tows in their company
    if (user.role === 'admin' && tow.companyId !== user.companyId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Farklı şirketlere ait çekme kayıtlarını güncelleyemezsiniz" 
      });
    }
    
    const updatedTow = await Tow.findByIdAndUpdate(
      towId,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(StatusCodes.OK).json({ 
      message: "Çekme kaydı başarıyla güncellendi",
      tow: updatedTow 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kaydı güncellenirken bir hata oluştu",
      error: error.message
    });
  }
};

// Delete a tow - Only superadmin can delete
const deleteTow = async (req, res) => {
  try {
    const { id: towId } = req.params;
    const user = await User.findById(req.user.userId);
    
    // Check if user has permission to delete
    if (user.role !== 'superadmin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi yapmak için yetkiniz yok. Sadece superadmin silebilir." 
      });
    }
    
    const tow = await Tow.findOne({ _id: towId });
    
    if (!tow) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Çekme kaydı bulunamadı" 
      });
    }
    
    await Tow.findByIdAndDelete(towId);
    
    res.status(StatusCodes.OK).json({ 
      message: "Çekme kaydı başarıyla silindi" 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kaydı silinirken bir hata oluştu",
      error: error.message
    });
  }
};

module.exports = {
  getAllTows,
  getTow,
  createTow,
  updateTow,
  deleteTow,
}; 