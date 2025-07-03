const User = require("../models/User");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { generateToken } = require("../services/token.service");
const bcrypt = require('bcrypt');

//Email
const verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email ve doğrulama kodu gereklidir."
      });
    }

    const user = await User.findOne({ email }).select('auth isVerified');

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı."
      });
    }

    if (user.isVerified) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Bu hesap zaten doğrulanmış."
      });
    }

    const numericVerificationCode = Number(verificationCode);

    if (user.auth.verificationCode !== numericVerificationCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Geçersiz doğrulama kodu. Lütfen tekrar kontrol ediniz."
      });
    }

    user.isVerified = true;
    user.auth.verificationCode = undefined;
    await user.save();

    return res.status(StatusCodes.OK).json({
      message: "Email adresiniz başarıyla doğrulandı."
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Email doğrulama işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz."
    });
  }
};

//Again Email
const againEmail = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  user.auth.verificationCode = verificationCode;
  await user.save();

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationCode: verificationCode,
  });
  res.json({ message: "Doğrulama kodu Gönderildi" });
};

//Register (Admin Only)
const register = async (req, res, next) => {
  try {   
    // Check if the requesting user is admin
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== 'admin') {
      throw new CustomError.UnauthorizedError("Bu işlemi sadece admin yapabilir");
    }

    const { name, email, password, picture, role, companyId } = req.body;

    //check email
    const emailAlreadyExists = await User.findOne({ email });
    if (emailAlreadyExists) {
      throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
    }

    // Use admin's company ID if not specified
    const userCompanyId = companyId || admin.companyId;

    const user = new User({
      name,
      email,
      profile: { picture },
      auth: {
        password
      },
      role: role || 'user',
      isVerified: true, // Users are verified by default now
      companyId: userCompanyId
    });

    await user.save();

    res.status(StatusCodes.CREATED).json({
      message: "Kullanıcı başarıyla oluşturuldu.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.profile.picture,
        role: user.role,
        companyId: user.companyId
      },
    });
  } catch (error) {
    next(error);
  }
};

//Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError.BadRequestError(
        "Lütfen e-posta adresinizi ve şifrenizi girin"
      );
    }
    const user = await User.findOne({ email }).select('auth profile name email role status companyId');

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
        email: user.email,
        picture: user.profile.picture,
        role: user.role,
        companyId: user.companyId,
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

//Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new CustomError.BadRequestError("Please provide valid email");
  }

  const user = await User.findOne({ email });

  if (user) {
    const passwordToken = crypto.randomBytes(70).toString("hex");
    // send email
    await sendResetPasswordEmail({
      name: user.name,
      email: user.email,
      token: passwordToken,
    });

    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

    user.auth.passwordToken = passwordToken;
    user.auth.passwordTokenExpirationDate = passwordTokenExpirationDate;
    await user.save();
  }

  res
    .status(StatusCodes.OK)
    .json({ msg: "Please check your email for reset password link" });
};

//Reset Password
const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    throw new CustomError.BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ email }).select('auth');

  if (user) {
    const currentDate = new Date();

    if (
      user.auth.passwordToken === token &&
      user.auth.passwordTokenExpirationDate > currentDate
    ) {
      user.auth.password = password;
      user.auth.passwordToken = null;
      user.auth.passwordTokenExpirationDate = null;
      await user.save();
    }
  }

  res.send("reset password");
};

//Edit Profile (Admin Only for password changes)
const editProfile = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    const { userId } = req.params;
    const targetUser = userId ? await User.findById(userId) : requestingUser;
    
    if (!targetUser) {
      throw new CustomError.NotFoundError("User not found");
    }

    const { name, email, password, picture, companyId } = req.body;
    
    // Check permissions
    const isAdmin = requestingUser.role === 'admin';
    const isOwnProfile = requestingUser._id.toString() === targetUser._id.toString();
    const isSameCompany = requestingUser.companyId === targetUser.companyId;
    
    // Only admin can edit other users, and only within the same company
    if (!isOwnProfile && (!isAdmin || !isSameCompany)) {
      throw new CustomError.UnauthorizedError("Bu işlemi yapmak için yetkiniz yok");
    }
    
    // Only admin can change passwords
    if (password && !isAdmin) {
      throw new CustomError.UnauthorizedError("Şifre değişikliği sadece admin tarafından yapılabilir");
    }

    // Only admin can change company ID
    if (companyId && !isAdmin) {
      throw new CustomError.UnauthorizedError("Şirket bilgisi değişikliği sadece admin tarafından yapılabilir");
    }

    if (name) targetUser.name = name;
    if (email && isAdmin) {
      // Check if new email already exists
      const emailExists = await User.findOne({ email, _id: { $ne: targetUser._id } });
      if (emailExists) {
        throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
      }
      targetUser.email = email;
    }
    if (password && isAdmin) targetUser.auth.password = password;
    if (picture) targetUser.profile.picture = picture;
    if (companyId && isAdmin) targetUser.companyId = companyId;

    await targetUser.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Profil başarıyla güncellendi",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
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

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    // Only get users from the same company as the requesting user
    const requestingUser = await User.findById(req.user.userId);
    
    if (!requestingUser) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    const users = await User.find({ companyId: requestingUser.companyId })
      .select('name email role status createdAt companyId');
    
    res.status(StatusCodes.OK).json({ users });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Kullanıcılar alınırken bir hata oluştu",
      error: error.message
    });
  }
};

// Edit User (Admin Only)
const editUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password, role, status, picture, companyId } = req.body;

    const admin = await User.findById(req.user.userId);

    // Check if the requesting user is admin
    if (admin.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi sadece admin yapabilir" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    // Admin can only edit users in their company
    if (user.companyId !== admin.companyId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Farklı şirket kullanıcılarını düzenleyemezsiniz" 
      });
    }

    // Update user fields if provided
    if (name) user.name = name;
    if (email) {
      // Check if new email already exists
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
      }
      user.email = email;
    }
    if (password) user.auth.password = password;
    if (role) user.role = role;
    if (status !== undefined) user.status = status;
    if (picture) user.profile.picture = picture;
    // Company ID can only be changed to the admin's own company ID
    if (companyId && companyId === admin.companyId) {
      user.companyId = companyId;
    }

    await user.save();

    res.status(StatusCodes.OK).json({ 
      message: "Kullanıcı bilgileri güncellendi",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
        companyId: user.companyId
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

// Delete User (Admin Only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const admin = await User.findById(req.user.userId);
  
    // Check if the requesting user is admin
    if (admin.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Bu işlemi sadece admin yapabilir" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: "Kullanıcı bulunamadı" 
      });
    }

    // Admin can only delete users in their company
    if (user.companyId !== admin.companyId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Farklı şirket kullanıcılarını silemezsiniz" 
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
  verifyEmail,
  againEmail,
  forgotPassword,
  resetPassword,
  getMyProfile,
  editProfile,
  getAllUsers,
  editUsers,
  deleteUser,
};