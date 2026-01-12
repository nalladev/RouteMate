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

// Catch uncaught exceptions before anything else
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION - Server will exit');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION - Server will exit');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

console.log('🚀 Starting RouteMate Backend Server...');
console.log('📁 Working directory:', process.cwd());
console.log('🔧 Node version:', process.version);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

require('dotenv').config();
console.log('✅ dotenv loaded');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
console.log('✅ Core dependencies loaded');

// Import middleware with error handling
let requestLogger, startSelfPing;
try {
    const loggerModule = require('./src/middleware/requestLogger');
    requestLogger = loggerModule.requestLogger;
    console.log('✅ Request logger loaded');
} catch (error) {
    console.error('❌ Failed to load requestLogger:', error.message);
    throw error;
}

try {
    const serverManagerModule = require('./src/utils/serverManager');
    startSelfPing = serverManagerModule.startSelfPing;
    console.log('✅ Server manager loaded');
} catch (error) {
    console.error('❌ Failed to load serverManager:', error.message);
    throw error;
}

// Import refactored routes with error handling
console.log('📦 Loading route modules...');
let authRoutes, logsRoutes, userRoutes, driverRoutes, passengerRoutes, ridesRoutes, proxyRoutes;

try {
    authRoutes = require('./src/routes/auth');
    console.log('  ✅ Auth routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load auth routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    logsRoutes = require('./src/routes/logs');
    console.log('  ✅ Logs routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load logs routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    userRoutes = require('./src/routes/user');
    console.log('  ✅ User routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load user routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    driverRoutes = require('./src/routes/driver');
    console.log('  ✅ Driver routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load driver routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    passengerRoutes = require('./src/routes/passenger');
    console.log('  ✅ Passenger routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load passenger routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    ridesRoutes = require('./src/routes/rides');
    console.log('  ✅ Rides routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load rides routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    proxyRoutes = require('./src/routes/proxy');
    console.log('  ✅ Proxy routes loaded');
} catch (error) {
    console.error('  ❌ Failed to load proxy routes:', error.message);
    console.error(error.stack);
    throw error;
}

console.log('✅ All routes loaded\n');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

console.log('⚙️  Setting up middleware...');

// CORS and Body Parser
try {
    app.use(cors());
    console.log('  ✅ CORS configured');
    app.use(bodyParser.json());
    console.log('  ✅ Body parser configured');
} catch (error) {
    console.error('  ❌ Failed to configure middleware:', error.message);
    console.error(error.stack);
    throw error;
}

// Request/Response Logging
try {
    app.use(requestLogger);
    console.log('  ✅ Request logger configured');
} catch (error) {
    console.error('  ❌ Failed to configure request logger:', error.message);
    console.error(error.stack);
    throw error;
}

// ============================================================================
// ROUTES
// ============================================================================

console.log('🛣️  Mounting routes...');

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
console.log('  ✅ Health check endpoint mounted');

// Mount all API routes
try {
    app.use('/api/auth', authRoutes);
    app.use('/api/logs', logsRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/driver', driverRoutes);
    app.use('/api/passenger', passengerRoutes);
    app.use('/api/rides', ridesRoutes);
    app.use('/api/proxy', proxyRoutes);
    console.log('  ✅ All API routes mounted');
} catch (error) {
    console.error('  ❌ Failed to mount routes:', error.message);
    console.error(error.stack);
    throw error;
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler - must be after all routes
app.use((req, res) => {
    console.warn(`[404] ⚠️  Route not found: ${req.method} ${req.originalUrl}`);
    console.warn(`[404] 📍 IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`);
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use((req, res) => {
    console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' console.log(`
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

    console.log('✅ Server started successfully!');
    console.log('⏰ Starting self-ping mechanism in 5 seconds...');

    // Start self-ping mechanism after server is ready
    setTimeout(() => {
        try {
            startSelfPing();
            console.log('✅ Self-ping mechanism started');
        } catch (error) {
            console.error('❌ Failed to start self-ping:', error.message);
        }
    }, 5000); // Wait 5 seconds for server to be fully ready
}).on('error', (error) => {
    console.error('❌ FATAL: Failed to start server');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please choose a different port.`);
    } else if (error.code === 'EACCES') {
        console.error(`Permission denied to bind to port ${port}. Try using a port > 1024.`);
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
});
