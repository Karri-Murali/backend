const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");

const getCoordsForAddress = require("../util/location");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something Went Wrong, Could not find the Place",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find the place with Provided Id",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  const user = require("../models/user");

  let userWithPlaces;
  try {
    userWithPlaces = await user.findById(userId).populate("places");
  } catch (err) {
    console.error("Error fetching user places:", err);
    const error = new HttpError(
      "Fetching User Places Failed, Please try again later",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return res.status(200).json({ places: [] });
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return next(
      new HttpError("Invalid Place Data ,Please check your Data", 422)
    );
  }

  const { title, address, description } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (err) {
    console.error("Error fetching coordinates:", err);
    return next(err);
  }

  const imagePath = req.file
    ? path.join("uploads", "images", req.file.filename)
    : "uploads/images/default.png";

  const createPlace = new Place({
    title,
    description,
    address,
    location: {
      lat: coordinates.lat,
      lng: coordinates.lon,
    },
    image: imagePath,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    console.error("Error finding user:", err);
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Could not find places for Provided User", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createPlace.save({ session: sess });
    user.places.push(createPlace);

    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.error("Error in transaction:", err);
    return next(new HttpError("Creating Place Failed", 500));
  }
  res.status(202).json({ place: createPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }
  const placeId = req.params.pid;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(err);
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place", 401));
  }
  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong could not update the Place", 500)
    );
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    return next(
      new HttpError("Fetching place failed, please try again later.", 500)
    );
  }

  if (!place) {
    return next(new HttpError("Could not find a place for this ID.", 404));
  }

  if (place.creator.id.toString() !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this place.", 403)
    );
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await Place.deleteOne({ _id: placeId }, { session: sess });
    place.creator.places.pull(place._id);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
    sess.endSession();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete the place.", 500)
    );
  }

  fs.unlink(imagePath, (err) => {
    if (err) {
      console.error(`Failed to delete image file: ${err.message}`);
    }
  });

  res.status(200).json({ message: "Place successfully deleted." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
