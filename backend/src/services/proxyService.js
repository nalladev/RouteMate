/**
 * Proxy Service
 * Handles external API calls (Nominatim for place search, OSRM for routing)
 */

const https = require('https');

/**
 * Search for places using Nominatim API
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of place results
 */
const searchPlaces = async (query) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nominatim.openstreetmap.org',
      path: `/search?format=json&q=${encodeURIComponent(query)}&limit=10`,
      method: 'GET',
      headers: {
        // Nominatim requires a valid User-Agent
        'User-Agent': 'RouteMate/1.0 (contact: support@routemate.app)'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const results = JSON.parse(data);
          resolve(results.map((item) => ({
            name: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: item.type,
            importance: item.importance
          })));
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
};

/**
 * Get route coordinates from OSRM routing service
 * @param {{latitude:number, longitude:number}} start
 * @param {{latitude:number, longitude:number}} end
 * @returns {Promise<Array<{latitude:number, longitude:number}>>}
 */
const getRouteCoordinates = async (start, end) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'router.project-osrm.org',
      path: `/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
      method: 'GET'
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.routes && parsedData.routes.length > 0) {
            const coordinates = parsedData.routes[0].geometry.coordinates.map((coord) => ({
              latitude: coord[1],
              longitude: coord[0]
            }));
            resolve(coordinates);
          } else {
            resolve([start, end]);
          }
        } catch (e) {
          resolve([start, end]);
        }
      });
    });

    request.on('error', (error) => {
      console.error('OSRM request error:', error);
      resolve([start, end]);
    });

    request.end();
  });
};

/**
 * Get route between two points using OSRM
 * @param {number} startLat
 * @param {number} startLon
 * @param {number} endLat
 * @param {number} endLon
 * @returns {Promise<{coordinates:Array<{latitude:number, longitude:number}>, distance:number, duration:number, steps:Array}>}
 */
const getRoute = async (startLat, startLon, endLat, endLon) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'router.project-osrm.org',
      path: `/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`,
      method: 'GET'
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.routes && parsedData.routes.length > 0) {
            const route = parsedData.routes[0];
            resolve({
              coordinates: route.geometry.coordinates.map((coord) => ({
                latitude: coord[1],
                longitude: coord[0]
              })),
              distance: route.distance,
              duration: route.duration,
              steps: (route.legs && route.legs[0] && route.legs[0].steps) ? route.legs[0].steps : []
            });
          } else {
            resolve({
              coordinates: [
                { latitude: startLat, longitude: startLon },
                { latitude: endLat, longitude: endLon }
              ],
              distance: 0,
              duration: 0,
              steps: []
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
};

module.exports = {
  searchPlaces,
  getRoute,
  getRouteCoordinates
};
