/**
 * RouteMate Backend Server
 * Main entry point - refactored to use modular architecture
 * 
 * This file is now a thin wrapper that:
 * 1. Sets up middleware (CORS, body parser, logging)
 * 2. Mounts routes from src/routes/
 * 3. Starts the server
 * 
 * All business logic has been extracted to src/services/
 * All routes are now in src/routes/
 * All utilities are in src/utils/
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import middleware
const { requestLogger } = require('./src/middleware/requestLogger');
const { startSelfPing } = require('./src/utils/serverManager');

// Import refactored routes
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

// Mount refactored routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);

// ============================================================================
// TODO: EXTRACT REMAINING ROUTES
// ============================================================================
// These legacy routes still need to be extracted to src/routes/:
// - /api/user/*     → Extract to src/routes/user.js
// - /api/driver/*   → Extract to src/routes/driver.js
// - /api/passenger/*→ Extract to src/routes/passenger.js
// - /api/rides/*    → Extract to src/routes/rides.js
// - /api/proxy/*    → Extract to src/routes/proxy.js
//
// Current status: Auth and Logs routes are refactored
// Legacy routes remain in old index.js file for backward compatibility

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         RouteMate Backend - Refactored Version             ║
║                                                            ║
║  ✅ Listening at http://localhost:${port}                  ║
║  ✅ Health check: http://localhost:${port}/health          ║
║                                                            ║
║  📁 New Architecture:                                       ║
║     - Modular code in src/                                 ║
║     - Services in src/services/                            ║
║     - Routes in src/routes/                                ║
║     - Middleware in src/middleware/                        ║
║     - Utils in src/utils/                                  ║
║                                                            ║
║  🚨 Error Logging to Telegram:                             ║
║     POST /api/logs/error                                   ║
║                                                            ║
║  📖 API Documentation:                                      ║
║     See openapi.yaml                                       ║
║                                                            ║
║  📚 Documentation Files:                                    ║
║     - 00_READ_ME_FIRST.md                                  ║
║     - QUICKSTART.md                                        ║
║     - BACKEND_STRUCTURE.md                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Start self-ping mechanism after server is ready
    setTimeout(startSelfPing, 5000); // Wait 5 seconds for server to be fully ready
});
