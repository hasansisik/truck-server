const User = require("../models/User");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { generateToken } = require("../services/token.service");

//Register (Admin and SuperAdmin Only)
const register = async (req, res, next) => {
  try {   
    // Check if the requesting user is admin or superadmin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || (requestingUser.role !== 'admin' && requestingUser.role !== 'superadmin')) {
      throw new CustomError.UnauthorizedError("Bu işlemi sadece admin veya superadmin yapabilir");
    }

    const { 
      name, 
      username, 
      password, 
      role, 
      companyId, 
      license, 
      experience 
    } = req.body;

    // Only superadmin can create admin users
    if (role === 'admin' && requestingUser.role !== 'superadmin') {
      throw new CustomError.UnauthorizedError("Admin kullanıcıları sadece superadmin oluşturabilir");
    }

    // Only superadmin can create superadmin users
    if (role === 'superadmin' && requestingUser.role !== 'superadmin') {
      throw new CustomError.UnauthorizedError("Superadmin kullanıcıları sadece superadmin oluşturabilir");
    }

    // Check if username is provided
    if (!username) {
      throw new CustomError.BadRequestError("Kullanıcı adı gereklidir.");
    }

    // Check username - this is the primary unique identifier
    const usernameAlreadyExists = await User.findOne({ username });
    if (usernameAlreadyExists) {
      throw new CustomError.BadRequestError("Bu kullanıcı adı zaten kayıtlı.");
    }

    // Use requesting user's company ID if not specified
    const userCompanyId = companyId || requestingUser.companyId;

    // Create driver info if applicable
    const driverInfo = role === 'driver' ? {
      license,
      experience,
      isDriver: true
    } : undefined;

    const userData = {
      name,
      username,
      auth: {
        password
      },
      role: role || 'driver',
      isVerified: true, // Users are verified by default now
      companyId: userCompanyId,
      driverInfo
    };

    const user = new User(userData);

    await user.save();

    res.status(StatusCodes.CREATED).json({
      message: "Kullanıcı başarıyla oluşturuldu.",
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        driverInfo: user.driverInfo
      },
    });
  } catch (error) {
    next(error);
  }
};

//Login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new CustomError.BadRequestError(
        "Lütfen kullanıcı adınızı ve şifrenizi girin"
      );
    }
    
    // Search by username only
    const user = await User.findOne({ username }).select('auth profile name username role status companyId driverInfo');

    if (!user) {
      throw new CustomError.UnauthenticatedError(
        "Ne yazık ki böyle bir kullanıcı yok"
      );
    }
    
    const isPasswordCorrect = await user.auth.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError("Kayıtlı şifreniz yanlış!");
    }
    
    // Check if user is active
    if (user.status === 'inactive') {
      throw new CustomError.UnauthenticatedError(
        "Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin."
      );
    }

    const accessToken = await generateToken(
      { userId: user._id, role: user.role, companyId: user.companyId },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { userId: user._id, role: user.role, companyId: user.companyId },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/auth/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    const token = new Token({
      refreshToken,
      accessToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      user: user._id,
    });

    await token.save();

    res.json({
      message: "login success.",
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        driverInfo: user.driverInfo,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Get My Profile
const getMyProfile = async (req, res, next) => {
  const user = await User.findById(req.user.userId);

  res.status(200).json({
    success: true,
    user,
  });
};

//Logout
const logout = async (req, res, next) => {
  try {
    await Token.findOneAndDelete({ user: req.user.userId });

    res.clearCookie("refreshtoken", { path: "/v1/auth/refreshtoken" });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged out!",
    });
  } catch (error) {
    next(error);
  }
};





//Edit Profile (Role-based permissions)
const editProfile = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    const { userId } = req.params;
    const targetUser = userId ? await User.findById(userId) : requestingUser;
    
    if (!targetUser) {
      throw new CustomError.NotFoundError("User not found");
    }

    const { name, password, companyId } = req.body;
    
    // Check permissions
    const isSuperAdmin = requestingUser.role === 'superadmin';
    const isAdmin = requestingUser.role === 'admin';
    const isOwnProfile = requestingUser._id.toString() === targetUser._id.toString();
    const isSameCompany = requestingUser.companyId === targetUser.companyId;
    
    // Permission checks based on roles
    if (!isOwnProfile) {
      // SuperAdmin can edit anyone
      if (!isSuperAdmin) {
        // Admin can only edit users in their company
        if (!isAdmin || !isSameCompany) {
          throw new CustomError.UnauthorizedError("Bu işlemi yapmak için yetkiniz yok");
        }
        
        // Admin cannot edit other admins or superadmins
        if ((targetUser.role === 'admin' || targetUser.role === 'superadmin') && !isSuperAdmin) {
          throw new CustomError.UnauthorizedError("Admin veya superadmin kullanıcıları sadece superadmin düzenleyebilir");
        }
      }
    }
    
    // Only superadmin or admin can change passwords
    if (password && !(isSuperAdmin || isAdmin)) {
      throw new CustomError.UnauthorizedError("Şifre değişikliği sadece admin veya superadmin tarafından yapılabilir");
    }

    // Only superadmin can change company ID
    if (companyId && !isSuperAdmin) {
      throw new CustomError.UnauthorizedError("Şirket bilgisi değişikliği sadece superadmin tarafından yapılabilir");
    }

    if (name) targetUser.name = name;
    
    // Password changes based on role
    if (password) {
      if (isSuperAdmin || (isAdmin && targetuser.role === 'driver')) {
        targetUser.auth.password = password;
      } else {
        throw new CustomError.UnauthorizedError("Şifre değişikliği için yeterli yetkiniz yok");
      }
    }
    
    // Picture can be changed by the user themselves or higher roles
    // if (picture) targetUser.profile.picture = picture; // Removed as per edit hint
    
    // Only superadmin can change company ID
    if (companyId && isSuperAdmin) targetUser.companyId = companyId;

    await targetUser.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Profil başarıyla güncellendi",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        profile: targetUser.profile,
        role: targetUser.role,
        companyId: targetUser.companyId
      }
    });
  } catch (error) {
    if (error instanceof CustomError.BadRequestError || 
        error instanceof CustomError.NotFoundError ||
        error instanceof CustomError.UnauthorizedError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: "Bir hata oluştu.", 
        error: error.message 
      });
    }
  }
};

// Get All Users (with role-based filtering)
const getAllUsers = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    
    if (!requestingUser) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    let query = {};
    
    // Role-based filtering:
    // - Superadmin can see all users
    // - Admin can only see users from their company
    // - Regular users can only see users from their company
    if (requestingUser.role === 'superadmin') {
      // Superadmin can see all users, no filter needed
      query = {};
    } else {
      // Admin and regular users can only see users from their company
      query = { companyId: requestingUser.companyId };
      
      // Regular users can't see admin or superadmin users
      if (requestinguser.role === 'driver') {
        query.role = 'user';
      }
    }

    const users = await User.find(query)
      .select('name username role status createdAt companyId driverInfo');
    
    res.status(StatusCodes.OK).json({ users });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Kullanıcılar alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Get All Drivers (users with role='driver')
const getAllDrivers = async (req, res) => {
  try {
    const { companyId, role } = req.user;
    
    // Filter drivers by company ID (superadmin can see all)
    const filter = {
      role: 'driver'
    };
    
    // Add company filter if not superadmin
    if (role !== 'superadmin') {
      filter.companyId = companyId;
    }
    
    const drivers = await User.find(filter)
      .select('name email username role status driverInfo profile companyId createdAt')
      .sort('name');
    
    res.status(StatusCodes.OK).json({ drivers });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Şoförler alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Edit User (Admin and SuperAdmin Only)
const editUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      name, 
      username, 
      password, 
      role, 
      status, 
      companyId,
      license,
      experience,
      isDriver
    } = req.body;

    const requestingUser = await User.findById(req.user.userId);

    // Check if the requesting user is admin or superadmin
    if (!requestingUser || (requestingUser.role !== 'admin' && requestingUser.role !== 'superadmin')) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi sadece admin veya superadmin yapabilir" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    // Admin can only edit users in their company
    if (requestingUser.role !== 'superadmin' && user.companyId !== requestingUser.companyId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Farklı şirket kullanıcılarını düzenleyemezsiniz" 
      });
    }

    // Only superadmin can edit admin or superadmin users
    if ((user.role === 'admin' || user.role === 'superadmin') && requestingUser.role !== 'superadmin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Admin veya superadmin kullanıcıları sadece superadmin düzenleyebilir" 
      });
    }

    // Only superadmin can change user roles to admin or superadmin
    if (role && (role === 'admin' || role === 'superadmin') && requestingUser.role !== 'superadmin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Kullanıcı rolünü admin veya superadmin olarak sadece superadmin değiştirebilir" 
      });
    }

    // Update user fields if provided
    if (name) user.name = name;
    
    // Username is required and must be unique
    if (username) {
      // Check if new username already exists
      const usernameExists = await User.findOne({ username, _id: { $ne: userId } });
      if (usernameExists) {
        throw new CustomError.BadRequestError("Bu kullanıcı adı zaten kayıtlı.");
      }
      user.username = username;
    }
    
    if (password) user.auth.password = password;
    
    // Update role if provided and authorized
    if (role && (requestingUser.role === 'superadmin' || role === 'user' || role === 'driver')) {
      user.role = role;
    }
    
    if (status !== undefined) user.status = status;
    
    // Company ID handling
    if (companyId) {
      if (requestingUser.role === 'superadmin') {
        // Superadmin can change to any company ID
        user.companyId = companyId;
      } else if (companyId === requestingUser.companyId) {
        // Admin can only change to their own company ID
        user.companyId = companyId;
      }
    }
    
    // Update driver information if applicable
    if (isDriver !== undefined || license || experience !== undefined) {
      // Initialize driverInfo if it doesn't exist
      if (!user.driverInfo) {
        user.driverInfo = {
          isDriver: false,
          license: '',
          experience: 0
        };
      }
      
      if (isDriver !== undefined) user.driverInfo.isDriver = isDriver;
      if (license) user.driverInfo.license = license;
      if (experience !== undefined) user.driverInfo.experience = experience;
      
      // If user is marked as a driver, update role accordingly
      if (isDriver === true && user.role !== 'driver') {
        user.role = 'driver';
      }
    }

    await user.save();

    res.status(StatusCodes.OK).json({ 
      message: "Kullanıcı bilgileri güncellendi",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        username: user.username,
        role: user.role,
        status: user.status,
        profile: user.profile,
        companyId: user.companyId,
        driverInfo: user.driverInfo
      }
    });
  } catch (error) {
    console.error("Error in editUsers:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Kullanıcı güncellenirken bir hata oluştu",
      error: error.message
    });
  }
};

// Delete User (SuperAdmin Only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = await User.findById(req.user.userId);
  
    // Check if the requesting user is superadmin
    if (!requestingUser || requestingUser.role !== 'superadmin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi sadece superadmin yapabilir" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    // Cannot delete yourself
    if (user._id.toString() === requestingUser._id.toString()) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Kendi hesabınızı silemezsiniz" 
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(StatusCodes.OK).json({ 
      message: "Kullanıcı başarıyla silindi" 
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Kullanıcı silinirken bir hata oluştu",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMyProfile,
  editProfile,
  getAllUsers,
  getAllDrivers,
  editUsers,
  deleteUser,
};