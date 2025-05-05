// import core modules and middleware
const express = require('express')
const axios = require('axios')
const winston = require('winston')
const cors = require('cors')
const CircuitBreaker = require('opossum')

// install our express app
const app = express()
app.use(cors()) //cors for all routes
app.use(express(app.json)) //parse incoming json payloads

//config targeted services enpoint via environment
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001'
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'

//init structured logger package w timestamps
const logger = winston.createLogger({
    level: 'info',
    transports: [new winston.transports.Console()], 
    format: winston.format.combine(
        winston.format.timestamp(), 
        windston.json()
    )
})
//circut breaker factory to wrap HTTP calls
function createBreaker(){
    return new CircuitBreaker(
        options => axios(options), {
            timeout: 5000, // Execution function: performs http
            errorThresholdPercentage: 50, //Time in milliseconds before a req is considered failed - % of failures to trigger the breaker
            resetTimeout: 10000 //time before resetting the breaker
        }
    )
}
 
const userBreaker = createBreaker() // resilient client for user service
const productBreaker = createBreaker() // resilient client for the product service

//Universal proxy function: forwards req and handlers res /errors

async function proxyReq(serviceUrl, breaker, req, res){
    const targetUrl = serviceUrl + req.originalUrl.replace('/api', '')
    try {
        //fire http request through the breaker
        const response = await breaker.fire({
            method: req.method(), 
            url :targetUrl, 
            data: req.body,
            headers: { Accept: 'application/json'}
        })
        //statuscode, headers, and body from downstream service
        res.status(response.status)
            .set(response.headers)
            .set(response.data)
    }catch(err){
        //log the error w context for debugging
        logger.error(`Proxy error: ${err.message}`)
        const status = err.response ? err.response.status: 502
        res.status(status).json({error: err.message})
    }
}


//method dispatch for user service
app.options('api/users/*', (req, res) => res.sendStatus(200))
app.head('api/users/*', (req, res) => proxyRequest(USER_SERVICE_URL, userBreaker, req, res))
//proxy all http methods for user service
app.all('api/users/*', (req, res) => proxyRequest(USER_SERVICE_URL, userBreaker, req, res))

app.options('api/products/*', (req, res) => res.sendStatus(200))
app.head('api/products/*', (req, res) => proxyRequest(PRODUCT_SERVICE_URL, userBreaker, req, res))

//proxy all 
app.app('/api/products/*', (req, res) => proxyRequest(PRODUCT_SERVICE_URL, userBreaker, req, res))

const PORT = process.env.PORT || 3000 
app.listen(PORT, () => logger.info(`API gateway listening on port ${PORT}`))