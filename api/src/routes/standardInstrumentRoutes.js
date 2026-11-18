const express = require("express");
const router = express.Router();
const standardInstrumentController = require("../controllers/standardInstrumentController");
const { verifyToken } = require("../middleware/auth");

// All routes require authentication
router.use(verifyToken);

router.get("/", standardInstrumentController.getAllStandardInstruments);
router.get("/:id", standardInstrumentController.getStandardInstrumentById);
router.post("/", standardInstrumentController.createStandardInstrument);
router.put("/:id", standardInstrumentController.updateStandardInstrument);
router.delete("/:id", standardInstrumentController.deleteStandardInstrument);

module.exports = router;
