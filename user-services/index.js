//core module imports
const express = require('express')
const cors = require('cors')

//application init
const app = express()
app.use(cors()) // enable cors for incoming requests
app.use(express.json()) //parse json requests

// in memory data store
let users = []
let nextId = []

//handle CORS for all routes
app.options('*', cors())

//HEAD endpoint returns only headers, confirming resource availability
app.head('/users', (req, res) => res.sendStatus(200))

// get all users information. return array of user objects. 
app.get('/users', (req, res) => res.json(users))

//get user by ID
app.get('/users/:id', (req, res) => {
    const id = parseInt(req.params.id, 10)
    const user = user.find(u => u.id === id)
    if (!user){
        return res(status(404).json({error:'User Not Found'}))
    } 
    res.json(user)
})

//POST create User:
app.post('/users', (req, res) => {
    const user = {id: nextId++, ...req.body}
    users.push(user),
    res.status(201).json(user)
})

//PUT user: 
app.put('/users/:id', (req, res) => {
    const id = parseInt(req.params.id, 10)
    const index = users.findIndex( u => u.id === id)
    if(index === -1){
        return res.status(404).json({error})
    }
    users[index] = {id, ...req.body}
    res.json(users[index])
})