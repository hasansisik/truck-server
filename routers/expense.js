const express = require("express");
const {
  getAllExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expense");
const { isAuthenticated, isAdminOrSuperAdmin, isSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Routes with specific permissions
router.route("/").get(getAllExpenses).post(createExpense);
router.route("/:id").get(getExpense);

// Admin or superadmin only routes
router.put("/:id", isAdminOrSuperAdmin, updateExpense);

// Superadmin only routes
router.delete("/:id", isSuperAdmin, deleteExpense);

module.exports = router; 