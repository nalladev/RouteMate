/**
 * Proxy Routes
 * Handles external API calls (Nominatim, OSRM)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { searchPlaces, getRoute } = require('../services/proxyService');

/**
 * GET /api/proxy/search-places
 * Search for places using Nominatim
 * Query params: q (search query)
 */
router.get('/search-places', authenticateToken, async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const results = await searchPlaces(query);
        res.status(200).json({ places: results });
    } catch (error) {
        console.error('Error searching places:', error);
        res.status(500).json({ error: 'Failed to search places' });
    }
});

/**
 * GET /api/proxy/route
 * Get route between two points using OSRM
 * Query params: start (lat,lon), end (lat,lon)
 */
router.get('/route', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end coordinates required' });
        }

        // Parse coordinates
        const [startLat, startLon] = start.split(',').map(Number);
        const [endLat, endLon] = end.split(',').map(Number);

        if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
            return res.status(400).json({ error: 'Invalid coordinates format' });
        }

        const route = await getRoute(startLat, startLon, endLat, endLon);
        // Convert to OpenAPI spec format: { points: [[lon, lat], ...] }
        const points = route.coordinates.map(coord => [coord.longitude, coord.latitude]);
        res.status(200).json({ points });
    } catch (error) {
        console.error('Error getting route:', error);
        res.status(500).json({ error: 'Failed to get route' });
    }
});

module.exports = router;
