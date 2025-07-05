const express = require("express");
const {
  getAllVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicle");
const { isAuthenticated, isAdminOrSuperAdmin , isSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all vehicles
router.get("/", getAllVehicles);

// Get a single vehicle
router.get("/:id", getVehicle);

// Create a vehicle (admin or superadmin only)
router.post("/", isAdminOrSuperAdmin, createVehicle);

// Update a vehicle (admin or superadmin only)
router.put("/:id", isSuperAdmin, updateVehicle);

// Delete a vehicle (admin or superadmin only)
router.delete("/:id", isSuperAdmin, deleteVehicle);

module.exports = router; 