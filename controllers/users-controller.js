const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../models/user");
const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Could not load Users, Please try again later", 500)
    );
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return next(
      new HttpError("Invalid Sign Up Details, Please Check your Data", 422)
    );
  }
  const { name, password, email } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new HttpError("Could to do Sign Up, Please try Again later", 500)
    );
  }
  if (existingUser) {
    return next(
      new HttpError("User exists is Already, try with another Email", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }
  const imagePath = req.file
    ? path.join("uploads", "images", req.file.filename)
    : "uploads/images/default.png";
  const createUser = new User({
    name,
    email,
    password: hashedPassword,
    image: imagePath,
    places: [],
  });
  try {
    await createUser.save();
  } catch (err) {
    return next(
      new HttpError("SignUp Failed, try again later" + err.message, 500)
    );
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createUser.id,
        email: createUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("SignUp Failed, try again later" + err.message, 500)
    );
  }
  res.status(201).json({
    userId: createUser.id,
    email: createUser.email,
    token: token,
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  const { email, password } = req.body;

  if (!errors.isEmpty) {
    return next(new HttpError("Invalid credentials,could not login"));
  }
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Could not login ,Please try again later", 500));
  }
  if (!existingUser) {
    return next(new HttpError("Invalid Credentials, Please try Again", 401));
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in,please login again later",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid Credentials, Please try Again", 401));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Login Failed, try again later" + err.message, 500)
    );
  }
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.login = login;
exports.signup = signup;
exports.getUsers = getUsers;
