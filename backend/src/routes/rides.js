/**
 * Rides Routes
 * Handles ride matching and status updates
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');
const { completeRide } = require('../services/rideService');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * POST /api/rides/match
 * Match a driver with a passenger
 */
router.post('/match', authenticateUser, async (req, res) => {
    try {
        const { requestId, sessionId } = req.body;

        if (!requestId || !sessionId) {
            return res.status(400).json({ error: 'Request ID and session ID required' });
        }

        // Get ride request
        const requestDoc = await db.collection('ride_requests').doc(requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ error: 'Ride request not found' });
        }

        const request = requestDoc.data();
        if (request.status !== 'waiting') {
            return res.status(400).json({ error: 'Ride request is not available' });
        }

        // Get driver session
        const sessionDoc = await db.collection('driver_sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Driver session not found' });
        }

        const session = sessionDoc.data();
        
        // Create ride match
        const rideData = {
            driverId: session.driverId,
            driverSessionId: sessionId,
            passengerId: request.passengerId,
            requestId: requestId,
            pickup: request.pickup,
            destination: request.destination,
            status: 'matched',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        const rideDoc = await db.collection('rides').add(rideData);

        // Update request status
        await db.collection('ride_requests').doc(requestId).update({
            status: 'matched',
            rideId: rideDoc.id,
            driverId: session.driverId,
            matchedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({
            message: 'Ride matched successfully',
            rideId: rideDoc.id
        });
    } catch (error) {
        console.error('Error matching ride:', error);
        res.status(500).json({ error: 'Failed to match ride' });
    }
});

/**
 * PUT /api/rides/:rideId/status
 * Update ride status
 */
router.put('/:rideId/status', authenticateUser, async (req, res) => {
    try {
        const { rideId } = req.params;
        const { status } = req.body;

        const validStatuses = ['matched', 'en_route_to_pickup', 'arrived_at_pickup', 'in_progress', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const rideRef = db.collection('rides').doc(rideId);
        const rideDoc = await rideRef.get();

        if (!rideDoc.exists) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        const ride = rideDoc.data();

        // Verify user is part of this ride
        const userId = req.user.uid;
        if (ride.driverId !== userId && ride.passengerId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update ride status
        await rideRef.update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });

        // If completed, award points
        if (status === 'completed') {
            await completeRide(rideId, ride);
        }

        res.status(200).json({
            message: 'Ride status updated',
            status
        });
    } catch (error) {
        console.error('Error updating ride status:', error);
        res.status(500).json({ error: 'Failed to update ride status' });
    }
});

module.exports = router;
