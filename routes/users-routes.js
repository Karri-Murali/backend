const express = require("express");
const { check } = require("express-validator");

const userControl = require("../controllers/users-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();
router.get("/", userControl.getUsers);

router.post("/login", [check("email").not().isEmpty()], userControl.login);
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userControl.signup
);

module.exports = router;
