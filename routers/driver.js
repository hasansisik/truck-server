const express = require("express");
const {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} = require("../controllers/driver");
const { isAuthenticated, isAdminOrSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all drivers
router.get("/", getAllDrivers);

// Get a single driver
router.get("/:id", getDriver);

// Create a driver (admin or superadmin only)
router.post("/", isAdminOrSuperAdmin, createDriver);

// Update a driver (admin or superadmin only)
router.put("/:id", isAdminOrSuperAdmin, updateDriver);

// Delete a driver (admin or superadmin only)
router.delete("/:id", isAdminOrSuperAdmin, deleteDriver);

module.exports = router; 