const express = require("express");
const { sendMessage, getChatHistory } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/", protect, getChatHistory);

module.exports = router;
