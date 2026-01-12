/**
 * Proxy Service
 * Handles external API calls (Nominatim for place search, OSRM for routing)
 */

const https = require('https');

/**
 * Get route coordinates from OSRM routing service
 * @param {Object} start - Start location {latitude, longitude}
 * @param {Object} end - End location {latitude, longitude}
 * @returns {Promise<Array>} Array of coordinates along the route
 */
const getRouteCoordinates = async (start, end) => {
    return new Promise((resolve, reject) => {
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
                        const coordinates = parsedData.routes[0].geometry.coordinates.map(coord => ({
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

module.exports = {
    getRouteCoordinates
};
