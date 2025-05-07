// Module imports
const express = require('express');  // Express web framework
const cors = require('cors');        // CORS middleware

// App initialization
const app = express();
app.use(cors());                    // Enable CORS for incoming requests
app.use(express.json());            // Parse JSON bodies automatically

// In-memory datastore and ID sequence simulation
let products = [];
let nextId = 1;

// Handle preflight CORS requests globally
app.options('*', cors());

// HEAD endpoint for resource availability
app.head('/products', (req, res) => res.sendStatus(200));

// GET all products: returns array of product objects
app.get('/products', (req, res) => res.json(products));

// GET product by ID: lookup and 404 handling
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST create product: assigns ID and persists new record
app.post('/products', (req, res) => {
  const product = { id: nextId++, ...req.body };
  products.push(product);
  res.status(201).json(product);
});

// PUT replace product: validates existence and replaces object
app.put('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  products[index] = { id, ...req.body };
  res.json(products[index]);
});

// PATCH update product: merges specified fields
app.patch('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  Object.assign(product, req.body);
  res.json(product);
});

// DELETE product: removes record and returns no content
app.delete('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  products = products.filter(p => p.id !== id);
  res.sendStatus(204);
});

// Launch Product Service on designated port
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.info(`Product Service listening on port ${PORT}`))