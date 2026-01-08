require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { db, auth } = require('./firebaseAdmin');
const { GeoPoint } = require('firebase-admin/firestore');
const https = require('https');

const app = express();
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

// Simple distance calculation helper (Haversine formula)
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
 * Initializes a user's document with default roles and verification if they don't exist.
 * This ensures backward compatibility for existing users.
 * @param {string} uid The user's unique ID from Firebase Auth.
 * @param {string} phone The user's phone number.
 */
const initializeUser = async (uid, phone) => {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists || !userDoc.data().roles || !userDoc.data().verification) {
        const userData = userDoc.data() || {};
        
        const updateData = {
            phone: phone,
            activeRole: userData.activeRole || 'passenger',
            roles: userData.roles || ['passenger'],
            verification: userData.verification || {
                passenger: { verified: true },
                driver: { verified: false }
            }
        };

        await userRef.set(updateData, { merge: true });
        console.log(`Initialized or updated roles for user ${uid}`);
    }
};


// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => { // Replace 'your_secret_key' with a real secret key
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
            } else {
                throw error;
            }
        }
        
        // Ensure user document is initialized with roles
        await initializeUser(userRecord.uid, userRecord.phoneNumber);

        const token = jwt.sign({ uid: userRecord.uid }, process.env.JWT_SECRET_KEY); // Replace with a real secret
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: `Error processing login: ${error.message}` });
    }
});

apiRouter.use('/auth', authRouter);

// --- User Data Routes ---
const userRouter = express.Router();
userRouter.use(authenticateToken);

userRouter.put('/location', async (req, res) => {
    const { uid } = req.user;
    const { location } = req.body;
    if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: 'Invalid location data.' });
    }

    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            location: new GeoPoint(location.latitude, location.longitude)
        }, { merge: true });
        res.status(200).json({ message: 'Location updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error updating location: ${error.message}` });
    }
});

userRouter.get('/wallet', async (req, res) => {
    const { uid } = req.user;
    try {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists || !doc.data().walletPoints) {
            await userRef.set({ walletPoints: 100 }, { merge: true });
            return res.status(200).json({ walletPoints: 100 });
        }
        res.status(200).json({ walletPoints: doc.data().walletPoints });
    } catch (error) {
        res.status(500).json({ message: `Error fetching wallet: ${error.message}` });
    }
});

userRouter.get('/rewards', async (req, res) => {
    const { uid } = req.user;
    try {
        const rewardsRef = db.collection('users').doc(uid).collection('rewards');
        const snapshot = await rewardsRef.get();
        const rewards = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                dateEarned: data.dateEarned.toDate().toISOString(),
            };
        });
        res.status(200).json({ rewards });
    } catch (error) {
        res.status(500).json({ message: `Error fetching rewards: ${error.message}` });
    }
});

userRouter.get('/profile', async (req, res) => {
    const { uid } = req.user;
    try {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userData = doc.data();
        // Convert GeoPoint to plain object for JSON serialization
        const profile = {
            uid: uid,
            status: userData.status || 'idle',
            location: userData.location ? {
                latitude: userData.location.latitude,
                longitude: userData.location.longitude
            } : null,
            destination: userData.destination ? {
                displayName: userData.destination.displayName,
                latitude: userData.destination.location.latitude,
                longitude: userData.destination.location.longitude
            } : null,
            walletPoints: userData.walletPoints || 0
        };
        res.status(200).json({ profile });
    } catch (error) {
        res.status(500).json({ message: `Error fetching profile: ${error.message}` });
    }
});

apiRouter.use('/user', userRouter);


// --- Driver Routes ---
const driverRouter = express.Router();
driverRouter.use(authenticateToken);

driverRouter.post('/session', async (req, res) => {
    const { uid } = req.user;
    const { destination } = req.body;
     if (!destination || !destination.displayName || !destination.latitude || !destination.longitude) {
        return res.status(400).json({ message: 'Invalid destination data.' });
    }
    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            status: 'driving',
            destination: {
                ...destination,
                location: new GeoPoint(destination.latitude, destination.longitude),
            }
        }, { merge: true });
        res.status(200).json({ message: "Session started. You are now a driver." });
    } catch (error) {
        res.status(500).json({ message: `Error starting session: ${error.message}` });
    }
});

driverRouter.delete('/session', async (req, res) => {
    const { uid } = req.user;
    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({ status: 'idle' });
        res.status(200).json({ message: 'Driving session ended.' });
    } catch (error) {
        res.status(500).json({ message: `Error ending session: ${error.message}` });
    }
});

driverRouter.get('/ride-requests', async (req, res) => {
    const { uid } = req.user;
    try {
        const driverDoc = await db.collection('users').doc(uid).get();
        const driverDestination = driverDoc.data().destination;

        const requestsSnapshot = await db.collection('ride_requests').where('status', '==', 'waiting').get();
        
        const rideRequests = requestsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(request => {
                const distance = getDistance(
                    driverDestination.location.latitude,
                    driverDestination.location.longitude,
                    request.destination.location.latitude,
                    request.destination.location.longitude
                );
                return distance < 5; // Simple 5km radius filter
            });

        res.status(200).json({ rideRequests });
    } catch (error) {
        res.status(500).json({ message: `Error fetching ride requests: ${error.message}` });
    }
});

driverRouter.put('/ride-requests/:id/accept', async (req, res) => {
    const { uid } = req.user;
    const { id } = req.params;
    try {
        const requestRef = db.collection('ride_requests').doc(id);
        await requestRef.update({
            status: 'picked_up',
            driverId: uid,
        });
        res.status(200).json({ message: 'Ride request accepted.' });
    } catch (error) {
        res.status(500).json({ message: `Error accepting ride request: ${error.message}` });
    }
});

driverRouter.put('/ride-requests/:id/complete', async (req, res) => {
    const { uid } = req.user;
    const { id } = req.params;
    try {
        const requestRef = db.collection('ride_requests').doc(id);
        const requestDoc = await requestRef.get();
        
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Ride request not found.' });
        }
        
        const requestData = requestDoc.data();
        if (requestData.driverId !== uid) {
            return res.status(403).json({ message: 'Unauthorized to complete this ride.' });
        }
        
        await requestRef.update({
            status: 'completed',
            completedAt: new Date(),
        });
        
        // Award points to both driver and passenger
        const pointsToAward = 10; // Base points for completing a ride
        
        // Award points to driver
        const driverRef = db.collection('users').doc(uid);
        const driverDoc = await driverRef.get();
        const currentDriverPoints = driverDoc.data()?.walletPoints || 0;
        await driverRef.update({
            walletPoints: currentDriverPoints + pointsToAward
        });
        
        // Add reward record for driver
        await driverRef.collection('rewards').add({
            title: 'Ride Completed',
            description: 'Completed a ride as a driver',
            points: pointsToAward,
            dateEarned: new Date(),
            status: 'Active'
        });
        
        // Award points to passenger
        const passengerRef = db.collection('users').doc(requestData.passengerId);
        const passengerDoc = await passengerRef.get();
        const currentPassengerPoints = passengerDoc.data()?.walletPoints || 0;
        await passengerRef.update({
            walletPoints: currentPassengerPoints + pointsToAward
        });
        
        // Add reward record for passenger
        await passengerRef.collection('rewards').add({
            title: 'Ride Completed',
            description: 'Completed a ride as a passenger',
            points: pointsToAward,
            dateEarned: new Date(),
            status: 'Active'
        });
        
        res.status(200).json({ 
            message: 'Ride completed successfully.',
            pointsAwarded: pointsToAward
        });
    } catch (error) {
        res.status(500).json({ message: `Error completing ride: ${error.message}` });
    }
});

apiRouter.use('/driver', driverRouter);


// --- Passenger Routes ---
const passengerRouter = express.Router();
passengerRouter.use(authenticateToken);

passengerRouter.post('/ride-request', async (req, res) => {
    const { uid } = req.user;
    const { destination, pickup } = req.body;
     if (!destination || !pickup) {
        return res.status(400).json({ message: 'Invalid pickup or destination data.' });
    }
    try {
        await db.collection('ride_requests').add({
            passengerId: uid,
            destination: {
                ...destination,
                 location: new GeoPoint(destination.latitude, destination.longitude),
            },
            pickup: {
                ...pickup,
                location: new GeoPoint(pickup.latitude, pickup.longitude),
            },
            status: 'waiting'
        });
        res.status(201).json({ message: 'Ride request created.' });
    } catch (error) {
        res.status(500).json({ message: `Error creating ride request: ${error.message}` });
    }
});

passengerRouter.delete('/ride-request', async (req, res) => {
    const { uid } = req.user;
    try {
        const snapshot = await db.collection('ride_requests').where('passengerId', '==', uid).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'No active ride request found.' });
        }
        const doc = snapshot.docs[0];
        await doc.ref.delete();
        res.status(200).json({ message: 'Ride request cancelled.' });
    } catch (error) {
        res.status(500).json({ message: `Error cancelling ride request: ${error.message}` });
    }
});

passengerRouter.get('/ride-request/status', async (req, res) => {
    const { uid } = req.user;
    try {
        const snapshot = await db.collection('ride_requests')
            .where('passengerId', '==', uid)
            .where('status', 'in', ['waiting', 'picked_up'])
            .get();
        
        if (snapshot.empty) {
            return res.status(404).json({ message: 'No active ride request found.' });
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        const rideRequest = {
            id: doc.id,
            status: data.status,
            destination: {
                displayName: data.destination.displayName,
                latitude: data.destination.location.latitude,
                longitude: data.destination.location.longitude
            },
            pickup: {
                latitude: data.pickup.location.latitude,
                longitude: data.pickup.location.longitude
            },
            driverId: data.driverId || null
        };
        
        res.status(200).json({ rideRequest });
    } catch (error) {
        res.status(500).json({ message: `Error fetching ride request status: ${error.message}` });
    }
});

passengerRouter.get('/drivers', async (req, res) => {
     // For simplicity, we'll just return all driving users. 
     // A real implementation would filter based on passenger's intended direction.
    try {
        const snapshot = await db.collection('users').where('status', '==', 'driving').get();
        const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ drivers });
    } catch (error) {
        res.status(500).json({ message: `Error fetching drivers: ${error.message}` });
    }
});

apiRouter.use('/passenger', passengerRouter);

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
                 res.status(500).json({ message: "Error parsing Nominatim response."})
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
                     res.status(404).json({ message: "Route not found."})
                }
            } catch (e) {
                 res.status(500).json({ message: "Error parsing OSRM response."})
            }
        });
    });

    request.on('error', (error) => {
        res.status(500).json({ message: `Proxy error: ${error.message}` });
    });
    
    request.end();
});


apiRouter.use('/proxy', proxyRouter);

// Mount the main API router
app.use('/api', apiRouter);


app.listen(port, () => {
    console.log(`RouteMate backend listening at http://localhost:${port}`);
});