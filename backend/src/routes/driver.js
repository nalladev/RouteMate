/**
 * Driver Routes
 * Handles driver-related endpoints including sessions, location updates, and ride requests
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');
const { getDistance } = require('../utils/geoUtils');
const { FieldValue } = require('firebase-admin/firestore');

// ============================================================================
// DRIVER SESSION MANAGEMENT
// ============================================================================

/**
 * POST /api/driver/session
 * Start a driving session with a destination
 */
router.post('/session', authenticateUser, async (req, res) => {
    try {
        const { destination } = req.body;
        const userId = req.user.uid;

        if (!destination || !destination.displayName || !destination.latitude || !destination.longitude) {
            return res.status(400).json({ error: 'Destination details required' });
        }

        // Get user's current location from database
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        if (!userData.location) {
            return res.status(400).json({ error: 'User location not available. Please update location first.' });
        }

        // Update user status to driving
        await db.collection('users').doc(userId).update({
            status: 'driving',
            destination: {
                displayName: destination.displayName,
                location: new db.GeoPoint(destination.latitude, destination.longitude)
            },
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ 
            message: 'Session started. You are now a driver.',
            status: 'driving'
        });
    } catch (error) {
        console.error('Error starting driver session:', error);
        res.status(500).json({ error: 'Failed to start driver session' });
    }
});

/**
 * DELETE /api/driver/session
 * End the current driving session
 */
router.delete('/session', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;

        await db.collection('users').doc(userId).update({
            status: 'idle',
            destination: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Driving session ended.' });
    } catch (error) {
        console.error('Error ending driver session:', error);
        res.status(500).json({ error: 'Failed to end driver session' });
    }
});

/**
 * PUT /api/driver/update-location
 * Update driver's current location
 */
router.put('/update-location', authenticateUser, async (req, res) => {
    try {
        const { location, heading, speed } = req.body;
        const userId = req.user.uid;

        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return res.status(400).json({ error: 'Valid location required' });
        }

        const updateData = {
            location: new db.GeoPoint(location.latitude, location.longitude),
            updatedAt: FieldValue.serverTimestamp()
        };

        if (heading !== undefined) updateData.heading = heading;
        if (speed !== undefined) updateData.speed = speed;

        await db.collection('users').doc(userId).update(updateData);

        res.status(200).json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating driver location:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// ============================================================================
// RIDE REQUESTS - Find Nearby Passengers
// ============================================================================

/**
 * GET /api/driver/nearby-requests
 * Get ride requests near the driver's route (within specified radius)
 * Query params: radius (optional, default 5km)
 */
router.get('/nearby-requests', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const radius = parseFloat(req.query.radius) || 5; // Default 5km radius

        // Get driver's current location and destination
        const driverDoc = await db.collection('users').doc(userId).get();
        if (!driverDoc.exists) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const driverData = driverDoc.data();
        if (!driverData.location || !driverData.destination) {
            return res.status(400).json({ error: 'Driver location or destination not available' });
        }

        const driverLat = driverData.location.latitude;
        const driverLon = driverData.location.longitude;

        // Get all waiting ride requests
        const requestsSnapshot = await db.collection('ride_requests')
            .where('status', '==', 'waiting')
            .get();

        const nearbyRequests = [];

        requestsSnapshot.forEach(doc => {
            const request = doc.data();
            
            // Check if pickup location exists
            if (request.pickup && request.pickup.latitude && request.pickup.longitude) {
                // Calculate distance from driver to pickup location
                const distance = getDistance(
                    driverLat,
                    driverLon,
                    request.pickup.latitude,
                    request.pickup.longitude
                );

                // Include requests within radius
                if (distance <= radius) {
                    nearbyRequests.push({
                        id: doc.id,
                        passengerId: request.passengerId,
                        pickup: {
                            latitude: request.pickup.latitude,
                            longitude: request.pickup.longitude,
                            name: request.pickup.name || 'Pickup Location'
                        },
                        destination: {
                            name: request.destination.name || request.destination.displayName,
                            latitude: request.destination.latitude,
                            longitude: request.destination.longitude
                        },
                        status: request.status,
                        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
                        createdAt: request.createdAt
                    });
                }
            }
        });

        // Sort by distance
        nearbyRequests.sort((a, b) => a.distance - b.distance);

        res.status(200).json({ requests: nearbyRequests });
    } catch (error) {
        console.error('Error fetching nearby requests:', error);
        res.status(500).json({ error: 'Failed to fetch nearby requests' });
    }
});

/**
 * PUT /api/driver/ride-requests/:id/accept
 * Accept a ride request
 */
router.put('/ride-requests/:id/accept', authenticateUser, async (req, res) => {
    try {
        const requestId = req.params.id;
        const driverId = req.user.uid;

        const requestRef = db.collection('ride_requests').doc(requestId);
        const requestDoc = await requestRef.get();

        if (!requestDoc.exists) {
            return res.status(404).json({ error: 'Ride request not found' });
        }

        const requestData = requestDoc.data();
        if (requestData.status !== 'waiting') {
            return res.status(400).json({ error: 'Ride request is no longer available' });
        }

        // Update request status
        await requestRef.update({
            status: 'matched',
            driverId: driverId,
            matchedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Ride request accepted' });
    } catch (error) {
        console.error('Error accepting ride request:', error);
        res.status(500).json({ error: 'Failed to accept ride request' });
    }
});

/**
 * PUT /api/driver/ride-requests/:id/complete
 * Complete a ride
 */
router.put('/ride-requests/:id/complete', authenticateUser, async (req, res) => {
    try {
        const requestId = req.params.id;
        const driverId = req.user.uid;

        const requestRef = db.collection('ride_requests').doc(requestId);
        const requestDoc = await requestRef.get();

        if (!requestDoc.exists) {
            return res.status(404).json({ error: 'Ride request not found' });
        }

        const requestData = requestDoc.data();
        if (requestData.driverId !== driverId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update request status
        await requestRef.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp()
        });

        // Award points to both driver and passenger
        const pointsToAward = 10;

        await db.collection('users').doc(driverId).update({
            walletPoints: FieldValue.increment(pointsToAward),
            'stats.totalRidesAsDriver': FieldValue.increment(1),
            'stats.totalPointsEarned': FieldValue.increment(pointsToAward)
        });

        await db.collection('users').doc(requestData.passengerId).update({
            walletPoints: FieldValue.increment(pointsToAward),
            'stats.totalRidesAsPassenger': FieldValue.increment(1),
            'stats.totalPointsEarned': FieldValue.increment(pointsToAward)
        });

        res.status(200).json({ 
            message: 'Ride completed successfully',
            pointsEarned: pointsToAward
        });
    } catch (error) {
        console.error('Error completing ride:', error);
        res.status(500).json({ error: 'Failed to complete ride' });
    }
});

module.exports = router;
