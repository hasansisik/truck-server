const express = require("express");
const {
  getAllTows,
  getTow,
  createTow,
  updateTow,
  deleteTow,
} = require("../controllers/tow");
const { isAuthenticated, isAdminOrSuperAdmin, isSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Routes with specific permissions
router.route("/").get(getAllTows).post(createTow);
router.route("/:id").get(getTow);

// Admin or superadmin only routes
router.put("/:id", isAdminOrSuperAdmin, updateTow);

// Superadmin only routes
router.delete("/:id", isSuperAdmin, deleteTow);

module.exports = router; 