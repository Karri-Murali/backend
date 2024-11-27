const HttpError = require("../models/http-error");

async function getCoordsForAddress(address) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`
    );

    const data = await response.json();
    if (!data || data.length == 0) {
      const error = new HttpError(
        "Could not find location for the specified address.",
        422
      );
      throw error;
    }
    const { lat, lon } = data[0];
    if (!lat || !lon) {
      throw new HttpError(
        "Incomplete location data received from geolocation API.",
        422
      );
    }
    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    };
  } catch (err) {
    throw err;
  }
}

module.exports = getCoordsForAddress;
