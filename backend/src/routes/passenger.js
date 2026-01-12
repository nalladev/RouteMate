/**
 * Passenger Routes
 * Handles passenger-related endpoints including ride requests and finding nearby drivers
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');
const { getDistance } = require('../utils/geoUtils');
const { FieldValue } = require('firebase-admin/firestore');

// ============================================================================
// RIDE REQUESTS
// ============================================================================

/**
 * POST /api/passenger/request-ride
 * Create a new ride request
 */
router.post('/request-ride', authenticateToken, async (req, res) => {
    try {
        const { destination, pickup } = req.body;
        const passengerId = req.user.uid;

        if (!destination || !destination.name || !destination.latitude || !destination.longitude) {
            return res.status(400).json({ error: 'Destination details required' });
        }

        if (!pickup || !pickup.latitude || !pickup.longitude) {
            return res.status(400).json({ error: 'Pickup location required' });
        }

        // Create ride request
        const requestData = {
            passengerId,
            pickup: {
                name: pickup.name || 'Pickup Location',
                latitude: pickup.latitude,
                longitude: pickup.longitude
            },
            destination: {
                name: destination.name || destination.displayName,
                latitude: destination.latitude,
                longitude: destination.longitude
            },
            status: 'waiting',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('ride_requests').add(requestData);

        res.status(201).json({ 
            message: 'Ride request created',
            requestId: docRef.id
        });
    } catch (error) {
        console.error('Error creating ride request:', error);
        res.status(500).json({ error: 'Failed to create ride request' });
    }
});

/**
 * DELETE /api/passenger/cancel-request
 * Cancel the passenger's active ride request
 */
router.delete('/cancel-request', authenticateToken, async (req, res) => {
    try {
        const passengerId = req.user.uid;

        // Find and delete passenger's active request
        const requestsSnapshot = await db.collection('ride_requests')
            .where('passengerId', '==', passengerId)
            .where('status', 'in', ['waiting', 'matched'])
            .get();

        if (requestsSnapshot.empty) {
            return res.status(404).json({ error: 'No active ride request found' });
        }

        // Delete all active requests (should typically be just one)
        const batch = db.batch();
        requestsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        res.status(200).json({ message: 'Ride request cancelled' });
    } catch (error) {
        console.error('Error cancelling ride request:', error);
        res.status(500).json({ error: 'Failed to cancel ride request' });
    }
});

/**
 * GET /api/passenger/request-status
 * Check the status of the current ride request
 */
router.get('/request-status', authenticateToken, async (req, res) => {
    try {
        const passengerId = req.user.uid;

        const requestsSnapshot = await db.collection('ride_requests')
            .where('passengerId', '==', passengerId)
            .where('status', 'in', ['waiting', 'matched'])
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (requestsSnapshot.empty) {
            return res.status(404).json({ error: 'No active ride request found' });
        }

        const requestDoc = requestsSnapshot.docs[0];
        const request = requestDoc.data();

        res.status(200).json({
            request: {
                id: requestDoc.id,
                status: request.status,
                destination: request.destination,
                pickup: request.pickup,
                driverId: request.driverId,
                matchedAt: request.matchedAt,
                createdAt: request.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching request status:', error);
        res.status(500).json({ error: 'Failed to fetch request status' });
    }
});

// ============================================================================
// FIND NEARBY DRIVERS
// ============================================================================

/**
 * GET /api/passenger/nearby-drivers
 * Get available drivers near the passenger (within specified radius)
 * Query params: radius (optional, default 10km)
 */
router.get('/nearby-drivers', authenticateToken, async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const radius = parseFloat(req.query.radius) || 10; // Default 10km radius

        // Get passenger's current location
        const passengerDoc = await db.collection('users').doc(passengerId).get();
        if (!passengerDoc.exists) {
            return res.status(404).json({ error: 'Passenger not found' });
        }

        const passengerData = passengerDoc.data();
        if (!passengerData.location) {
            return res.status(400).json({ error: 'Passenger location not available' });
        }

        const passengerLat = passengerData.location.latitude;
        const passengerLon = passengerData.location.longitude;

        // Get all active drivers
        const driversSnapshot = await db.collection('users')
            .where('status', '==', 'driving')
            .get();

        const nearbyDrivers = [];

        driversSnapshot.forEach(doc => {
            const driver = doc.data();
            
            // Check if driver has location
            if (driver.location && driver.location.latitude && driver.location.longitude) {
                // Calculate distance from passenger to driver
                const distance = getDistance(
                    passengerLat,
                    passengerLon,
                    driver.location.latitude,
                    driver.location.longitude
                );

                // Include drivers within radius
                if (distance <= radius) {
                    nearbyDrivers.push({
                        driverId: doc.id,
                        sessionId: driver.sessionId || null,
                        currentLocation: {
                            latitude: driver.location.latitude,
                            longitude: driver.location.longitude
                        },
                        destination: driver.destination ? {
                            displayName: driver.destination.displayName,
                            latitude: driver.destination.location.latitude,
                            longitude: driver.destination.location.longitude
                        } : null,
                        estimatedArrival: null,
                        availableSeats: 4,
                        _distance: distance // Internal use for sorting
                    });
                }
            }
        });

        // Sort by distance
        nearbyDrivers.sort((a, b) => a._distance - b._distance);
        
        // Remove internal sorting field before sending response
        nearbyDrivers.forEach(driver => delete driver._distance);

        res.status(200).json({ drivers: nearbyDrivers });
    } catch (error) {
        console.error('Error fetching nearby drivers:', error);
        res.status(500).json({ error: 'Failed to fetch nearby drivers' });
    }
});

/**
 * GET /api/passenger/drivers
 * Get all available drivers (legacy endpoint for backward compatibility)
 * This endpoint is now deprecated in favor of /nearby-drivers with radius
 */
router.get('/drivers', authenticateToken, async (req, res) => {
    try {
        // Redirect to nearby-drivers with a large radius (50km)
        req.query.radius = req.query.radius || '50';
        return router.handle(
            { ...req, url: '/nearby-drivers', method: 'GET' },
            res
        );
    } catch (error) {
        console.error('Error in legacy drivers endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

module.exports = router;
