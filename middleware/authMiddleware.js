const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");

const isAuthenticated = async function (req, res, next) {
  if (!req.headers["authorization"])
    return next(createHttpError.Unauthorized());
  const bearerToken = req.headers["authorization"];
  const token = bearerToken.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
    if (err) {
      return next(createHttpError.Unauthorized());
    }
    req.user = payload;
    next();
  });
};

const isAdmin = async function (req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(createHttpError.Unauthorized("Admin yetkisi gerekli"));
  }
  next();
};

const isSuperAdmin = async function (req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return next(createHttpError.Unauthorized("Superadmin yetkisi gerekli"));
  }
  next();
};

const isAdminOrSuperAdmin = async function (req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return next(createHttpError.Unauthorized("Admin veya Superadmin yetkisi gerekli"));
  }
  next();
};

const checkRole = function(roles) {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createHttpError.Unauthorized(`Bu işlem için yeterli yetkiniz yok. Gereken roller: ${roles.join(', ')}`));
    }
    next();
  };
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  checkRole
};
