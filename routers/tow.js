const express = require("express");
const {
  getAllTows,
  getTow,
  createTow,
  updateTow,
  deleteTow,
} = require("../controllers/tow");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

router.route("/").get(getAllTows).post(createTow);
router.route("/:id").get(getTow).put(updateTow).delete(deleteTow);

module.exports = router; 