const express = require("express");
const {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/company");
const { isAuthenticated, isSuperAdmin,isAdminOrSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all companies
router.get("/", getAllCompanies);

// Get a single company
router.get("/:id", getCompany);

// Create a company (superadmin only)
router.post("/", isAdminOrSuperAdmin, createCompany);

// Update a company
// Note: The controller handles permission checks
router.put("/:id", isSuperAdmin, updateCompany);

// Delete a company (superadmin only)
router.delete("/:id", isSuperAdmin, deleteCompany);

module.exports = router; 