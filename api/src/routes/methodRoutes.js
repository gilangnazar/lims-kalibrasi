const express = require("express");
const router = express.Router();
const methodController = require("../controllers/methodController");
const { verifyToken } = require("../middleware/auth");

// All routes require authentication
router.use(verifyToken);

router.get("/", methodController.getMethods);
router.get("/:id", methodController.getMethodById);
router.post("/", methodController.createMethod);
router.put("/:id", methodController.updateMethod);
router.delete("/:id", methodController.deleteMethod);

module.exports = router;
