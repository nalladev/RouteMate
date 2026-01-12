/**
 * Geolocation Utility Functions
 * Helper functions for distance, bearing, and route compatibility calculations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a));
};

/**
 * Calculate bearing (angle) from point 1 to point 2
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees (0-360)
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
};

/**
 * Check if a passenger's pickup/destination is compatible with driver's route
 * @param {Array} driverRoute - Array of coordinates along driver's route
 * @param {Object} passengerPickup - Passenger's pickup location {latitude, longitude}
 * @param {Object} passengerDestination - Passenger's destination {latitude, longitude}
 * @param {number} maxDetour - Maximum acceptable detour distance in km (default: 5)
 * @returns {boolean} True if route is compatible
 */
const isRouteCompatible = (driverRoute, passengerPickup, passengerDestination, maxDetour = 5) => {
    if (!driverRoute || driverRoute.length === 0) {
        return false;
    }

    // Find minimum distance from pickup to any point on driver's route
    const pickupDistance = Math.min(
        ...driverRoute.map(point => getDistance(
            point.latitude, point.longitude,
            passengerPickup.latitude, passengerPickup.longitude
        ))
    );

    // Find minimum distance from destination to any point on driver's route
    const destinationDistance = Math.min(
        ...driverRoute.map(point => getDistance(
            point.latitude, point.longitude,
            passengerDestination.latitude, passengerDestination.longitude
        ))
    );

    return pickupDistance <= maxDetour && destinationDistance <= maxDetour;
};

module.exports = {
    getDistance,
    calculateBearing,
    isRouteCompatible
};
