/**
 * User Routes
 * Handles user-related endpoints including profile, location, wallet, and rewards
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

// ============================================================================
// USER PROFILE
// ============================================================================

/**
 * GET /api/user/profile
 * Get user's profile information
 */
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        res.status(200).json({
            profile: {
                uid: userId,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
                phoneNumber: userData.phoneNumber,
                walletPoints: userData.walletPoints || 0,
                status: userData.status || 'idle',
                location: userData.location,
                stats: userData.stats || {},
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// ============================================================================
// LOCATION MANAGEMENT
// ============================================================================

/**
 * PUT /api/user/location
 * Update user's current location
 * Implements smart update logic to reduce unnecessary database writes
 */
router.put('/location', authenticateUser, async (req, res) => {
    try {
        const { location, heading, speed, accuracy } = req.body;
        const userId = req.user.uid;

        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return res.status(400).json({ error: 'Valid location required' });
        }

        // Get current user data to check last update
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        const now = new Date();
        
        // Smart update logic: Only update if conditions are met
        let shouldUpdate = false;
        let updateReason = '';

        // Always update if no previous location
        if (!userData.location || !userData.updatedAt) {
            shouldUpdate = true;
            updateReason = 'first_location';
        } else {
            const lastUpdate = userData.updatedAt.toDate();
            const timeSinceUpdate = (now - lastUpdate) / 1000; // seconds

            // Update based on user status
            if (userData.status === 'driving') {
                // Drivers: Update every 10 seconds or if significant movement
                if (timeSinceUpdate >= 10) {
                    shouldUpdate = true;
                    updateReason = 'driver_time_interval';
                }
            } else if (userData.status === 'searching' || userData.status === 'passenger') {
                // Passengers: Update every 15 seconds
                if (timeSinceUpdate >= 15) {
                    shouldUpdate = true;
                    updateReason = 'passenger_time_interval';
                }
            } else {
                // Idle users: Update every 30 seconds only
                if (timeSinceUpdate >= 30) {
                    shouldUpdate = true;
                    updateReason = 'idle_time_interval';
                }
            }

            // Also update if significant distance change (>50 meters)
            if (!shouldUpdate) {
                const prevLat = userData.location.latitude;
                const prevLon = userData.location.longitude;
                const distance = calculateSimpleDistance(
                    prevLat, prevLon,
                    location.latitude, location.longitude
                );
                
                if (distance > 0.05) { // 50 meters
                    shouldUpdate = true;
                    updateReason = 'significant_movement';
                }
            }
        }

        // Only update database if conditions are met
        if (shouldUpdate) {
            const updateData = {
                location: new db.GeoPoint(location.latitude, location.longitude),
                updatedAt: FieldValue.serverTimestamp()
            };

            if (heading !== undefined) updateData.heading = heading;
            if (speed !== undefined) updateData.speed = speed;
            if (accuracy !== undefined) updateData.accuracy = accuracy;

            await db.collection('users').doc(userId).update(updateData);

            res.status(200).json({ 
                message: 'Location updated successfully',
                reason: updateReason
            });
        } else {
            // Location update skipped to reduce server load
            res.status(200).json({ 
                message: 'Location update skipped',
                reason: 'no_significant_change'
            });
        }
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// ============================================================================
// WALLET & REWARDS
// ============================================================================

/**
 * GET /api/user/wallet
 * Get user's wallet points balance
 */
router.get('/wallet', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const walletPoints = userDoc.data().walletPoints || 0;
        res.status(200).json({ walletPoints });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
});

/**
 * GET /api/user/rewards
 * Get user's rewards history
 */
router.get('/rewards', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;

        const rewardsSnapshot = await db.collection('rewards')
            .where('userId', '==', userId)
            .orderBy('dateEarned', 'desc')
            .limit(50)
            .get();

        const rewards = [];
        rewardsSnapshot.forEach(doc => {
            const reward = doc.data();
            rewards.push({
                id: doc.id,
                title: reward.description || reward.type,
                description: reward.description,
                points: reward.amount,
                dateEarned: reward.dateEarned,
                status: reward.status || 'active',
                type: reward.type
            });
        });

        res.status(200).json({ rewards });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple distance calculation (Haversine formula)
 * Returns distance in kilometers
 */
function calculateSimpleDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

module.exports = router;
