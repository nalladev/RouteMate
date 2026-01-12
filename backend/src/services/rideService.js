/**
 * Ride Service
 * Handles ride matching and completion logic
 */

const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Complete a ride and award points to both driver and passenger
 * @param {string} rideId - Ride ID
 * @param {Object} ride - Ride data
 * @returns {Promise<void>}
 */
const completeRide = async (rideId, ride) => {
    const pointsToAward = 10;

    // Update driver stats and points
    const driverRef = db.collection('users').doc(ride.driverId);
    await driverRef.update({
        walletPoints: FieldValue.increment(pointsToAward),
        'stats.totalRidesAsDriver': FieldValue.increment(1),
        'stats.totalPointsEarned': FieldValue.increment(pointsToAward)
    });

    // Update passenger stats and points
    const passengerRef = db.collection('users').doc(ride.passengerId);
    await passengerRef.update({
        walletPoints: FieldValue.increment(pointsToAward),
        'stats.totalRidesAsPassenger': FieldValue.increment(1),
        'stats.totalPointsEarned': FieldValue.increment(pointsToAward)
    });

    // Add rewards for driver
    await db.collection('rewards').add({
        userId: ride.driverId,
        type: 'driver_completion',
        amount: pointsToAward,
        description: 'Completed ride as driver',
        metadata: { rideId: rideId },
        status: 'active',
        dateEarned: FieldValue.serverTimestamp()
    });

    // Add rewards for passenger
    await db.collection('rewards').add({
        userId: ride.passengerId,
        type: 'passenger_completion',
        amount: pointsToAward,
        description: 'Completed ride as passenger',
        metadata: { rideId: rideId },
        status: 'active',
        dateEarned: FieldValue.serverTimestamp()
    });

    // Update request status
    await db.collection('ride_requests')
        .where('passengerId', '==', ride.passengerId)
        .where('status', '==', 'matched')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                doc.ref.update({ status: 'completed' });
            });
        });
};

module.exports = {
    completeRide
};
