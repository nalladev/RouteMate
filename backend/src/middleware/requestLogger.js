/**
 * Request/Response Logging Middleware
 * Logs all incoming requests and outgoing responses
 */

const requestLogger = (req, res, next) => {
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
};

module.exports = { requestLogger };
