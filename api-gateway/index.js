// Import required modules and middleware
const express = require('express');              // Fast, minimalist web framework
const axios = require('axios');                  // Promise-based HTTP client
const CircuitBreaker = require('opossum');       // Circuit breaker for resilience
const winston = require('winston');              // Structured logging library
const cors = require('cors');                    // Middleware to handle CORS

// Create Express application instance
const app = express();                           // Initialize main app
app.use(cors());                                 // Enable CORS for all incoming requests
app.use(express.json());                         // Parse JSON bodies automatically

// Configure target service base URLs using environment variables
// Allows separation of concerns between code and deployment configuration
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Initialize Winston logger with timestamp and JSON formatting for observability
const logger = winston.createLogger({
  level: 'info',                                 // Default log level
  transports: [new winston.transports.Console()],// Log to console (can add file transports)
  format: winston.format.combine(
    winston.format.timestamp(),                  // Add timestamp to each log entry
    winston.format.json()                        // Output logs as JSON for downstream parsing
  ),
});

// Factory function to create a circuit breaker for HTTP calls
function createBreaker() {
  return new CircuitBreaker(
    options => axios(options),                   // Action: execute HTTP request via Axios
    {
      timeout: 5000,                              // Request timeout in ms
      errorThresholdPercentage: 50,               // % of failures to trip the breaker
      resetTimeout: 10000                         // Time in ms to attempt closing the circuit
    }
  );
}

// Instantiate circuit breakers for each downstream service
const userBreaker = createBreaker();             // Protects calls to User Service
const productBreaker = createBreaker();          // Protects calls to Product Service

// Proxy function to forward client requests to appropriate microservice
async function proxyRequest(serviceUrl, breaker, req, res) {
  const targetUrl = serviceUrl + req.originalUrl.replace('/api', '');
  try {
    // Fire HTTP request through circuit breaker
    const response = await breaker.fire({
      method: req.method,                        // Preserve HTTP verb (GET, POST, etc.)
      url: targetUrl,                            // Construct full URL to downstream service
      data: req.body,                            // Include request payload for POST/PUT/PATCH
      headers: { Accept: 'application/json' }     // Expect JSON response
    });

    // Forward status code, headers, and body from downstream service
    res.status(response.status)
       .set(response.headers)
       .send(response.data);
  } catch (err) {
    // Log the error with context for debugging and metrics
    logger.error(`Proxy error: ${err.message}`, { serviceUrl, path: req.originalUrl });
    // Determine status code: use downstream status if available, else Bad Gateway
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: err.message });
  }
}

// CORS preflight and HEAD for User Service endpoints
app.options('/api/users/*', (req, res) => res.sendStatus(200));
app.head('/api/users/*', (req, res) => proxyRequest(USER_SERVICE_URL, userBreaker, req, res));

// Proxy all HTTP methods for User Service
app.all('/api/users/*', (req, res) => proxyRequest(USER_SERVICE_URL, userBreaker, req, res));

// CORS preflight and HEAD for Product Service endpoints
app.options('/api/products/*', (req, res) => res.sendStatus(200));
app.head('/api/products/*', (req, res) => proxyRequest(PRODUCT_SERVICE_URL, productBreaker, req, res));

// Proxy all HTTP methods for Product Service
app.all('/api/products/*', (req, res) => proxyRequest(PRODUCT_SERVICE_URL, productBreaker, req, res));

// Health check endpoint for orchestrators (Kubernetes, etc.)
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Start the API Gateway server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`API Gateway listening on port ${PORT}`));