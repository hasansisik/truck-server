const Expense = require("../models/Expense");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get all expenses for the user's company
const getAllExpenses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    const expenses = await Expense.find({ companyId: user.companyId }).sort({ date: -1 });
    
    res.status(StatusCodes.OK).json({ expenses });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Masraf kayıtları alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get a single expense
const getExpense = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const user = await User.findById(req.user.userId);
    
    const expense = await Expense.findOne({ _id: expenseId, companyId: user.companyId });
    
    if (!expense) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Masraf kaydı bulunamadı" 
      });
    }
    
    res.status(StatusCodes.OK).json({ expense });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Masraf kaydı alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Create an expense
const createExpense = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const expenseData = {
      ...req.body,
      userId: req.user.userId,
      companyId: user.companyId
    };
    
    const expense = await Expense.create(expenseData);
    
    res.status(StatusCodes.CREATED).json({ 
      message: "Masraf kaydı başarıyla oluşturuldu",
      expense 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Masraf kaydı oluşturulurken bir hata oluştu",
      error: error.message
    });
  }
};

// Update an expense - Only admin and superadmin can update
const updateExpense = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const user = await User.findById(req.user.userId);
    
    // Check if user has permission to update
    if (user.role === 'driver') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi yapmak için yetkiniz yok. Sadece admin ve superadmin güncelleyebilir." 
      });
    }
    
    const expense = await Expense.findOne({ _id: expenseId, companyId: user.companyId });
    
    if (!expense) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Masraf kaydı bulunamadı" 
      });
    }
    
    // Superadmin can update any expense
    // Admin can only update expenses in their company
    if (user.role === 'admin' && expense.companyId !== user.companyId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Farklı şirketlere ait masraf kayıtlarını güncelleyemezsiniz" 
      });
    }
    
    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(StatusCodes.OK).json({ 
      message: "Masraf kaydı başarıyla güncellendi",
      expense: updatedExpense 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Masraf kaydı güncellenirken bir hata oluştu",
      error: error.message
    });
  }
};

// Delete an expense - Only superadmin can delete
const deleteExpense = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const user = await User.findById(req.user.userId);
    
    // Check if user has permission to delete
    if (user.role !== 'superadmin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi yapmak için yetkiniz yok. Sadece superadmin silebilir." 
      });
    }
    
    const expense = await Expense.findOne({ _id: expenseId });
    
    if (!expense) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Masraf kaydı bulunamadı" 
      });
    }
    
    await Expense.findByIdAndDelete(expenseId);
    
    res.status(StatusCodes.OK).json({ 
      message: "Masraf kaydı başarıyla silindi" 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Masraf kaydı silinirken bir hata oluştu",
      error: error.message
    });
  }
};

module.exports = {
  getAllExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
}; 