// Core module imports
const express = require('express');  // Express web framework
const cors = require('cors');        // CORS middleware

// Application initialization
const app = express();
app.use(cors());                    // Enable CORS for incoming requests
app.use(express.json());            // Automatically parse JSON request bodies

// In-memory datastore simulation and ID sequencing
let users = [];
let nextId = 1;

// Handle preflight CORS requests for all routes
app.options('*', cors());

// HEAD endpoint returns only headers, confirming resource availability
app.head('/users', (req, res) => res.sendStatus(200));

// GET all users: returns array of user objects
app.get('/users', (req, res) => res.json(users));

// GET user by ID: performs lookup and handles missing resources
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST create user: assigns ID and persists new user
app.post('/users', (req, res) => {
  const user = { id: nextId++, ...req.body };
  users.push(user);
  res.status(201).json(user);
});

// PUT replace user: validates existence and replaces entire object
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  users[index] = { id, ...req.body };
  res.json(users[index]);
});

// PATCH update user: merges provided fields into existing record
app.patch('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  Object.assign(user, req.body);
  res.json(user);
});

// DELETE user: removes record and responds with no content
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  users = users.filter(u => u.id !== id);
  res.sendStatus(204);
});

// Start the User Service on configured port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.info(`User Service listening on port ${PORT}`));