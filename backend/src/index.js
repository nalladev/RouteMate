/**
 * RouteMate Backend Server
 * Main entry point - App initialization and route mounting
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import middleware
const { requestLogger } = require('./src/middleware/requestLogger');
const { startSelfPing } = require('./src/utils/serverManager');

// Import routes
const authRoutes = require('./src/routes/auth');
const logsRoutes = require('./src/routes/logs');

const app = express();
const port = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// CORS and Body Parser
app.use(cors());
app.use(bodyParser.json());

// Request/Response Logging
app.use(requestLogger);

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
    const isSelfPing = req.get('X-Self-Ping') === 'true';

    if (isSelfPing) {
        console.log(`[${new Date().toISOString()}] 🏓 Self-ping received - Status: 200`);
    }

    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);

// TODO: Add remaining routes (user, driver, passenger, rides, proxy)
// For now, maintain backward compatibility by keeping routes from index.js
// This file will be organized into separate route files:
// - /api/user       -> src/routes/user.js
// - /api/driver     -> src/routes/driver.js
// - /api/passenger  -> src/routes/passenger.js
// - /api/rides      -> src/routes/rides.js
// - /api/proxy      -> src/routes/proxy.js

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(port, () => {
    console.log(`RouteMate backend listening at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);

    // Start self-ping mechanism after server is ready
    setTimeout(startSelfPing, 5000); // Wait 5 seconds for server to be fully ready
});
