const Tow = require("../models/Tow");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all tows based on user role
const getAllTows = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    let tows;
    
    // Role-based filtering
    if (user.role === 'driver') {
      // Regular users can only see their own tow records
      tows = await Tow.find({ 
        companyId: user.companyId,
        userId: req.user.userId 
      }).populate('userId', 'name email');
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      // Admin and superadmin can see all tows in their company
      tows = await Tow.find({ companyId: user.companyId })
        .populate('userId', 'name email');
    } else {

    }

    console.log(tows);
    res.status(StatusCodes.OK).json({ tows });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Çekme kayıtları alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single tow based on user role
const getTow = async (req, res) => {
  try {
    const { id: towId } = req.params;
    const user = await User.findById(req.user.userId);
    
    let tow;
    
    // Role-based access
    if (user.role === 'driver') {
      // Regular users can only see their own tow records
      tow = await Tow.findOne({ 
        _id: towId, 
        companyId: user.companyId,
        userId: req.user.userId 
      }).populate('userId', 'name email');
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      // Admin and superadmin can see all tows in their company
      tow = await Tow.findOne({ 
        _id: towId, 
        companyId: user.companyId 
      }).populate('userId', 'name email');
    } else {

    }
    
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

// Update a tow - Role-based permissions
const updateTow = async (req, res) => {
  try {
    const { id: towId } = req.params;
    const user = await User.findById(req.user.userId);
    
    let tow;
    
    // Role-based access and update permissions
    if (user.role === 'driver') {
      // Regular users can only update their own tow records
      tow = await Tow.findOne({ 
        _id: towId, 
        companyId: user.companyId,
        userId: req.user.userId 
      });
      
      if (!tow) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
          message: "Çekme kaydı bulunamadı veya güncelleme yetkiniz yok" 
        });
      }
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      // Admin and superadmin can update all tows in their company
      tow = await Tow.findOne({ _id: towId, companyId: user.companyId });
      
      if (!tow) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
          message: "Çekme kaydı bulunamadı" 
        });
      }
    } else {

    }
    
    const updatedTow = await Tow.findByIdAndUpdate(
      towId,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');
    
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