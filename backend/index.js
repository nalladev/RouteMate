require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { db, auth } = require('./firebaseAdmin');
const { GeoPoint, FieldValue } = require('firebase-admin/firestore');
const https = require('https');

const app = express();

// Self-ping mechanism to keep server awake on Render
const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes in milliseconds
const SERVER_URL = 'https://routemate-jpsc.onrender.com/health';

function selfPing() {
    https.get(SERVER_URL, (res) => {
        console.log(`[${new Date().toISOString()}] 🏓 Self-ping successful - Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error(`[${new Date().toISOString()}] ❌ Self-ping failed:`, err.message);
    });
}

// Start self-ping after server is running
function startSelfPing() {
    console.log(`[${new Date().toISOString()}] 🚀 Starting self-ping mechanism - pinging every 13 minutes`);
    selfPing(); // Initial ping
    setInterval(selfPing, PING_INTERVAL);
}

const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging Middleware for Requests and Responses
app.use((req, res, next) => {
    const startTime = Date.now();
    
    console.log(`\n[${new Date().toISOString()}] 📥 REQUEST RECEIVED`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Path: ${req.path}`);
    console.log(`   Query: ${JSON.stringify(req.query)}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Payload: ${JSON.stringify(req.body, null, 2)}`);
    }
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        console.log(`\n[${new Date().toISOString()}] 📤 RESPONSE SENT`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Duration: ${duration}ms`);
        
        try {
            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
            console.log(`   Body: ${JSON.stringify(responseData, null, 2)}`);
        } catch (e) {
            console.log(`   Body: ${data}`);
        }
        console.log(`   ${'═'.repeat(60)}`);
        
        return originalSend.call(this, data);
    };
    
    next();
});

// Utility Functions
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

const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
};

const isRouteCompatible = (driverRoute, passengerPickup, passengerDestination, maxDetour = 5) => {
    // Simple route compatibility check
    // In a real implementation, you'd use proper routing algorithms
    const pickupDistance = Math.min(
        ...driverRoute.map(point => getDistance(
            point.latitude, point.longitude,
            passengerPickup.latitude, passengerPickup.longitude
        ))
    );
    
    const destinationDistance = Math.min(
        ...driverRoute.map(point => getDistance(
            point.latitude, point.longitude,
            passengerDestination.latitude, passengerDestination.longitude
        ))
    );
    
    return pickupDistance <= maxDetour && destinationDistance <= maxDetour;
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Routes ---
const apiRouter = express.Router();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// --- Authentication Routes ---
const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByPhoneNumber(phone);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                userRecord = await auth.createUser({ phoneNumber: phone });
                
                // Create user profile in Firestore
                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    phone: phone,
                    walletPoints: 100, // Welcome bonus
                    createdAt: FieldValue.serverTimestamp(),
                    stats: {
                        totalRidesAsDriver: 0,
                        totalRidesAsPassenger: 0,
                        rating: 5.0,
                        totalPointsEarned: 100
                    }
                });

                // Add welcome reward
                await db.collection('rewards').add({
                    userId: userRecord.uid,
                    type: 'bonus',
                    amount: 100,
                    description: 'Welcome bonus',
                    metadata: { category: 'signup' },
                    status: 'active',
                    dateEarned: FieldValue.serverTimestamp()
                });
            } else {
                throw error;
            }
        }

        const token = jwt.sign({ uid: userRecord.uid }, process.env.JWT_SECRET_KEY);
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: `Error processing login: ${error.message}` });
    }
});

authRouter.post('/firebase', async (req, res) => {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
        return res.status(400).json({ message: 'Firebase token is required.' });
    }

    try {
        // Verify Firebase token
        const decodedToken = await auth.verifyIdToken(firebaseToken);
        const { uid, phone_number, email } = decodedToken;

        // Check if user exists in Firestore
        let userDoc = await db.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            // Create new user in Firestore
            const userData = {
                uid: uid,
                phone: phone_number || '',
                email: email || '',
                walletPoints: 100, // Welcome bonus
                createdAt: FieldValue.serverTimestamp(),
                stats: {
                    totalRidesAsDriver: 0,
                    totalRidesAsPassenger: 0,
                    rating: 5.0,
                    totalPointsEarned: 100
                }
            };

            await db.collection('users').doc(uid).set(userData);

            // Add welcome reward
            await db.collection('rewards').add({
                userId: uid,
                type: 'bonus',
                amount: 100,
                description: 'Welcome bonus',
                metadata: { category: 'signup' },
                status: 'active',
                dateEarned: FieldValue.serverTimestamp()
            });
        }

        // Generate backend JWT token
        const token = jwt.sign({ uid: uid }, process.env.JWT_SECRET_KEY);
        res.status(200).json({ token });
    } catch (error) {
        console.error('Firebase token verification failed:', error);
        res.status(401).json({ message: 'Invalid Firebase token.' });
    }
});

apiRouter.use('/auth', authRouter);

// --- User Routes ---
const userRouter = express.Router();
userRouter.use(authenticateToken);

userRouter.put('/location', async (req, res) => {
    const { uid } = req.user;
    const { location, heading, speed, accuracy } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: 'Invalid location data.' });
    }

    try {
        await db.collection('user_locations').doc(uid).set({
            userId: uid,
            location: new GeoPoint(location.latitude, location.longitude),
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || 10,
            isActive: true,
            updatedAt: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Location updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error updating location: ${error.message}` });
    }
});

userRouter.get('/profile', async (req, res) => {
    const { uid } = req.user;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const userData = userDoc.data();
        const locationDoc = await db.collection('user_locations').doc(uid).get();
        
        const profile = {
            uid: uid,
            phone: userData.phone,
            walletPoints: userData.walletPoints || 0,
            stats: userData.stats || {},
            location: locationDoc.exists ? {
                latitude: locationDoc.data().location.latitude,
                longitude: locationDoc.data().location.longitude,
                updatedAt: locationDoc.data().updatedAt?.toDate().toISOString()
            } : null
        };
        
        res.status(200).json({ profile });
    } catch (error) {
        res.status(500).json({ message: `Error fetching profile: ${error.message}` });
    }
});

userRouter.get('/wallet', async (req, res) => {
    const { uid } = req.user;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const walletPoints = userDoc.exists ? userDoc.data().walletPoints || 0 : 0;
        res.status(200).json({ walletPoints });
    } catch (error) {
        res.status(500).json({ message: `Error fetching wallet: ${error.message}` });
    }
});

userRouter.get('/rewards', async (req, res) => {
    const { uid } = req.user;
    try {
        const rewardsSnapshot = await db.collection('rewards')
            .where('userId', '==', uid)
            .orderBy('dateEarned', 'desc')
            .limit(50)
            .get();
        
        const rewards = rewardsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                dateEarned: data.dateEarned.toDate().toISOString(),
                expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null
            };
        });
        
        res.status(200).json({ rewards });
    } catch (error) {
        res.status(500).json({ message: `Error fetching rewards: ${error.message}` });
    }
});

apiRouter.use('/user', userRouter);

// --- Driver Routes ---
const driverRouter = express.Router();
driverRouter.use(authenticateToken);

driverRouter.post('/start-session', async (req, res) => {
    const { uid } = req.user;
    const { startLocation, destination, capacity, preferences } = req.body;
    
    if (!startLocation || !destination || !startLocation.latitude || !startLocation.longitude ||
        !destination.latitude || !destination.longitude) {
        return res.status(400).json({ message: 'Invalid location data.' });
    }

    try {
        // Check if user already has an active session
        const existingSession = await db.collection('driver_sessions')
            .where('driverId', '==', uid)
            .where('status', '==', 'active')
            .get();
        
        if (!existingSession.empty) {
            return res.status(400).json({ message: 'You already have an active driving session.' });
        }

        // Get route from external API (simplified)
        const route = await getRouteCoordinates(startLocation, destination);
        
        const sessionData = {
            driverId: uid,
            startLocation: new GeoPoint(startLocation.latitude, startLocation.longitude),
            destination: {
                name: destination.name || 'Destination',
                location: new GeoPoint(destination.latitude, destination.longitude),
                placeId: destination.placeId
            },
            route: {
                coordinates: route.map(coord => new GeoPoint(coord.latitude, coord.longitude)),
                distance: getDistance(startLocation.latitude, startLocation.longitude, 
                                   destination.latitude, destination.longitude),
                estimatedDuration: Math.ceil(getDistance(startLocation.latitude, startLocation.longitude,
                                                        destination.latitude, destination.longitude) * 2) // Rough estimate
            },
            capacity: capacity || 4,
            status: 'active',
            preferences: {
                allowDetours: preferences?.allowDetours || true,
                maxDetourDistance: preferences?.maxDetourDistance || 5,
                passengerTypes: preferences?.passengerTypes || ['any']
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        const sessionRef = await db.collection('driver_sessions').add(sessionData);
        
        // Update user location as active
        await db.collection('user_locations').doc(uid).set({
            userId: uid,
            location: new GeoPoint(startLocation.latitude, startLocation.longitude),
            heading: 0,
            speed: 0,
            isActive: true,
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(201).json({ 
            message: 'Driving session started successfully.',
            sessionId: sessionRef.id
        });
    } catch (error) {
        res.status(500).json({ message: `Error starting session: ${error.message}` });
    }
});

driverRouter.put('/update-location', async (req, res) => {
    const { uid } = req.user;
    const { location, heading, speed } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: 'Invalid location data.' });
    }

    try {
        await db.collection('user_locations').doc(uid).update({
            location: new GeoPoint(location.latitude, location.longitude),
            heading: heading || 0,
            speed: speed || 0,
            updatedAt: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Location updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error updating location: ${error.message}` });
    }
});

driverRouter.get('/nearby-requests', async (req, res) => {
    const { uid } = req.user;
    try {
        // Get driver's active session
        const sessionSnapshot = await db.collection('driver_sessions')
            .where('driverId', '==', uid)
            .where('status', '==', 'active')
            .get();
        
        if (sessionSnapshot.empty) {
            return res.status(400).json({ message: 'No active driving session found.' });
        }

        const session = sessionSnapshot.docs[0].data();
        
        // Get ride requests that are compatible with driver's route
        const requestsSnapshot = await db.collection('ride_requests')
            .where('status', '==', 'waiting')
            .get();
        
        const compatibleRequests = [];
        
        for (const doc of requestsSnapshot.docs) {
            const request = doc.data();
            const pickup = request.pickup.location;
            const destination = request.destination.location;
            
            // Check if request is compatible with driver's route
            if (isRouteCompatible(session.route.coordinates, pickup, destination, 
                                session.preferences.maxDetourDistance)) {
                compatibleRequests.push({
                    id: doc.id,
                    ...request,
                    pickup: {
                        name: request.pickup.name,
                        latitude: pickup.latitude,
                        longitude: pickup.longitude
                    },
                    destination: {
                        name: request.destination.name,
                        latitude: destination.latitude,
                        longitude: destination.longitude
                    },
                    estimatedDetour: Math.min(
                        getDistance(session.startLocation.latitude, session.startLocation.longitude,
                                  pickup.latitude, pickup.longitude),
                        getDistance(session.destination.location.latitude, session.destination.location.longitude,
                                  destination.latitude, destination.longitude)
                    )
                });
            }
        }

        res.status(200).json({ requests: compatibleRequests });
    } catch (error) {
        res.status(500).json({ message: `Error fetching nearby requests: ${error.message}` });
    }
});

driverRouter.delete('/end-session', async (req, res) => {
    const { uid } = req.user;
    try {
        // End active session
        const sessionSnapshot = await db.collection('driver_sessions')
            .where('driverId', '==', uid)
            .where('status', '==', 'active')
            .get();
        
        if (!sessionSnapshot.empty) {
            await sessionSnapshot.docs[0].ref.update({
                status: 'completed',
                updatedAt: FieldValue.serverTimestamp()
            });
        }
        
        // Set location as inactive
        await db.collection('user_locations').doc(uid).update({
            isActive: false,
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Driving session ended successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error ending session: ${error.message}` });
    }
});

apiRouter.use('/driver', driverRouter);

// --- Passenger Routes ---
const passengerRouter = express.Router();
passengerRouter.use(authenticateToken);

passengerRouter.post('/request-ride', async (req, res) => {
    const { uid } = req.user;
    const { pickup, destination, preferences } = req.body;
    
    if (!pickup || !destination || !pickup.latitude || !pickup.longitude ||
        !destination.latitude || !destination.longitude) {
        return res.status(400).json({ message: 'Invalid pickup or destination data.' });
    }

    try {
        // Check if user already has an active request
        const existingRequest = await db.collection('ride_requests')
            .where('passengerId', '==', uid)
            .where('status', 'in', ['waiting', 'matched', 'picked_up'])
            .get();
        
        if (!existingRequest.empty) {
            return res.status(400).json({ message: 'You already have an active ride request.' });
        }

        const requestData = {
            passengerId: uid,
            pickup: {
                name: pickup.name || 'Pickup Location',
                location: new GeoPoint(pickup.latitude, pickup.longitude),
                placeId: pickup.placeId
            },
            destination: {
                name: destination.name || 'Destination',
                location: new GeoPoint(destination.latitude, destination.longitude),
                placeId: destination.placeId
            },
            preferences: {
                maxWaitTime: preferences?.maxWaitTime || 10,
                maxWalkDistance: preferences?.maxWalkDistance || 500,
                priceRange: preferences?.priceRange
            },
            status: 'waiting',
            estimatedDistance: getDistance(pickup.latitude, pickup.longitude,
                                         destination.latitude, destination.longitude),
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        };

        const requestRef = await db.collection('ride_requests').add(requestData);
        
        res.status(201).json({ 
            message: 'Ride request created successfully.',
            requestId: requestRef.id
        });
    } catch (error) {
        res.status(500).json({ message: `Error creating ride request: ${error.message}` });
    }
});

passengerRouter.get('/nearby-drivers', async (req, res) => {
    const { uid } = req.user;
    try {
        // Get passenger's active request
        const requestSnapshot = await db.collection('ride_requests')
            .where('passengerId', '==', uid)
            .where('status', '==', 'waiting')
            .get();
        
        if (requestSnapshot.empty) {
            return res.status(400).json({ message: 'No active ride request found.' });
        }

        const request = requestSnapshot.docs[0].data();
        
        // Get active driver sessions
        const sessionsSnapshot = await db.collection('driver_sessions')
            .where('status', '==', 'active')
            .get();
        
        const compatibleDrivers = [];
        
        for (const doc of sessionsSnapshot.docs) {
            const session = doc.data();
            
            // Check if driver's route is compatible with passenger's request
            if (isRouteCompatible(session.route.coordinates, 
                                request.pickup.location, 
                                request.destination.location,
                                session.preferences.maxDetourDistance)) {
                
                // Get driver's current location
                const locationDoc = await db.collection('user_locations').doc(session.driverId).get();
                
                if (locationDoc.exists && locationDoc.data().isActive) {
                    const location = locationDoc.data().location;
                    compatibleDrivers.push({
                        driverId: session.driverId,
                        sessionId: doc.id,
                        currentLocation: {
                            latitude: location.latitude,
                            longitude: location.longitude
                        },
                        destination: {
                            name: session.destination.name,
                            latitude: session.destination.location.latitude,
                            longitude: session.destination.location.longitude
                        },
                        estimatedArrival: Math.ceil(
                            getDistance(location.latitude, location.longitude,
                                      request.pickup.location.latitude, request.pickup.location.longitude) / 40 * 60
                        ), // Rough estimate in minutes
                        availableSeats: session.capacity - (session.currentPassengers || 0)
                    });
                }
            }
        }

        res.status(200).json({ drivers: compatibleDrivers });
    } catch (error) {
        res.status(500).json({ message: `Error fetching nearby drivers: ${error.message}` });
    }
});

passengerRouter.get('/request-status', async (req, res) => {
    const { uid } = req.user;
    try {
        const requestSnapshot = await db.collection('ride_requests')
            .where('passengerId', '==', uid)
            .where('status', 'in', ['waiting', 'matched', 'picked_up'])
            .get();
        
        if (requestSnapshot.empty) {
            return res.status(404).json({ message: 'No active ride request found.' });
        }

        const doc = requestSnapshot.docs[0];
        const data = doc.data();
        const request = {
            id: doc.id,
            status: data.status,
            pickup: {
                name: data.pickup.name,
                latitude: data.pickup.location.latitude,
                longitude: data.pickup.location.longitude
            },
            destination: {
                name: data.destination.name,
                latitude: data.destination.location.latitude,
                longitude: data.destination.location.longitude
            },
            createdAt: data.createdAt.toDate().toISOString(),
            expiresAt: data.expiresAt.toDate().toISOString()
        };

        // If matched, get ride details
        if (data.status !== 'waiting') {
            const rideSnapshot = await db.collection('active_rides')
                .where('requestId', '==', doc.id)
                .get();
            
            if (!rideSnapshot.empty) {
                const ride = rideSnapshot.docs[0].data();
                request.rideId = rideSnapshot.docs[0].id;
                request.driverId = ride.driverId;
            }
        }

        res.status(200).json({ request });
    } catch (error) {
        res.status(500).json({ message: `Error fetching request status: ${error.message}` });
    }
});

passengerRouter.delete('/cancel-request', async (req, res) => {
    const { uid } = req.user;
    try {
        const requestSnapshot = await db.collection('ride_requests')
            .where('passengerId', '==', uid)
            .where('status', 'in', ['waiting', 'matched'])
            .get();
        
        if (requestSnapshot.empty) {
            return res.status(404).json({ message: 'No active ride request found.' });
        }

        await requestSnapshot.docs[0].ref.update({
            status: 'cancelled',
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Ride request cancelled successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error cancelling request: ${error.message}` });
    }
});

apiRouter.use('/passenger', passengerRouter);

// --- Ride Management Routes ---
const rideRouter = express.Router();
rideRouter.use(authenticateToken);

rideRouter.post('/match', async (req, res) => {
    const { uid } = req.user;
    const { requestId, sessionId } = req.body;
    
    if (!requestId || !sessionId) {
        return res.status(400).json({ message: 'Request ID and Session ID are required.' });
    }

    try {
        // Get request and session details
        const requestDoc = await db.collection('ride_requests').doc(requestId).get();
        const sessionDoc = await db.collection('driver_sessions').doc(sessionId).get();
        
        if (!requestDoc.exists || !sessionDoc.exists) {
            return res.status(404).json({ message: 'Request or session not found.' });
        }

        const request = requestDoc.data();
        const session = sessionDoc.data();

        // Verify the driver is making this request
        if (session.driverId !== uid) {
            return res.status(403).json({ message: 'Unauthorized to match this request.' });
        }

        // Create active ride
        const rideData = {
            driverId: uid,
            driverSessionId: sessionId,
            passengerId: request.passengerId,
            requestId: requestId,
            pickup: request.pickup,
            destination: request.destination,
            route: {
                pickupToDestination: [], // Would be calculated from routing API
                totalDistance: request.estimatedDistance,
                estimatedDuration: Math.ceil(request.estimatedDistance / 40 * 60) // Rough estimate
            },
            status: 'matched',
            timestamps: {
                matched: FieldValue.serverTimestamp()
            },
            fare: {
                amount: Math.ceil(request.estimatedDistance * 2), // $2 per km
                currency: 'USD',
                pointsUsed: 0
            }
        };

        const rideRef = await db.collection('active_rides').add(rideData);

        // Update request status
        await db.collection('ride_requests').doc(requestId).update({
            status: 'matched',
            updatedAt: FieldValue.serverTimestamp()
        });

        res.status(201).json({ 
            message: 'Ride matched successfully.',
            rideId: rideRef.id
        });
    } catch (error) {
        res.status(500).json({ message: `Error matching ride: ${error.message}` });
    }
});

rideRouter.put('/:rideId/status', async (req, res) => {
    const { uid } = req.user;
    const { rideId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['en_route_to_pickup', 'arrived_at_pickup', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const rideDoc = await db.collection('active_rides').doc(rideId).get();
        
        if (!rideDoc.exists) {
            return res.status(404).json({ message: 'Ride not found.' });
        }

        const ride = rideDoc.data();
        
        // Verify user is part of this ride
        if (ride.driverId !== uid && ride.passengerId !== uid) {
            return res.status(403).json({ message: 'Unauthorized to update this ride.' });
        }

        const updateData = {
            status: status,
            updatedAt: FieldValue.serverTimestamp()
        };

        // Add timestamp for this status
        updateData[`timestamps.${status === 'in_progress' ? 'started' : status}`] = FieldValue.serverTimestamp();

        await db.collection('active_rides').doc(rideId).update(updateData);

        // If completed, award points and update stats
        if (status === 'completed') {
            await completeRide(rideId, ride);
        }

        res.status(200).json({ message: `Ride status updated to ${status}.` });
    } catch (error) {
        res.status(500).json({ message: `Error updating ride status: ${error.message}` });
    }
});

// Helper function to complete ride and award points
async function completeRide(rideId, ride) {
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

    // Add rewards
    await db.collection('rewards').add({
        userId: ride.driverId,
        type: 'driver_completion',
        amount: pointsToAward,
        description: 'Completed ride as driver',
        metadata: { rideId: rideId },
        status: 'active',
        dateEarned: FieldValue.serverTimestamp()
    });

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
}

apiRouter.use('/rides', rideRouter);

// --- Proxy Routes ---
const proxyRouter = express.Router();

proxyRouter.get('/search-places', (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: 'Query parameter "q" is required.' });
    }

    const options = {
        hostname: 'nominatim.openstreetmap.org',
        path: `/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        method: 'GET',
        headers: {
            'User-Agent': 'RouteMateBackend/1.0'
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            try {
                res.status(200).json({ places: JSON.parse(data) });
            } catch (e) {
                res.status(500).json({ message: "Error parsing Nominatim response." });
            }
        });
    });

    request.on('error', (error) => {
        res.status(500).json({ message: `Proxy error: ${error.message}` });
    });

    request.end();
});

proxyRouter.get('/route', (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ message: 'Start and end parameters are required.' });
    }

    const options = {
        hostname: 'router.project-osrm.org',
        path: `/route/v1/driving/${start};${end}?overview=full&geometries=geojson`,
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
                    res.status(200).json({ points: parsedData.routes[0].geometry.coordinates });
                } else {
                    res.status(404).json({ message: "Route not found." });
                }
            } catch (e) {
                res.status(500).json({ message: "Error parsing OSRM response." });
            }
        });
    });

    request.on('error', (error) => {
        res.status(500).json({ message: `Proxy error: ${error.message}` });
    });
    
    request.end();
});

apiRouter.use('/proxy', proxyRouter);

// Helper function to get route coordinates (simplified)
async function getRouteCoordinates(start, end) {
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
                        // Fallback to direct line if no route found
                        resolve([start, end]);
                    }
                } catch (e) {
                    resolve([start, end]);
                }
            });
        });

        request.on('error', (error) => {
            resolve([start, end]);
        });
        
        request.end();
    });
}

// Mount the main API router
app.use('/api', apiRouter);

app.listen(port, () => {
    console.log(`RouteMate backend listening at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    
    // Start self-ping mechanism after server is ready
    setTimeout(startSelfPing, 5000); // Wait 5 seconds for server to be fully ready
});