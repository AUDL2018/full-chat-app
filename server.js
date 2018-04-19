// Load Express framework module
const express = require('express')

// Load express-session to support sessions
const session = require('express-session')

// Load bcrypt for password hashing
// Used to compare password with stored and encrypted password
const bcrypt = require('bcrypt')

// Load Joi module for validation
const Joi = require('joi')

// Load database config
const db = require('./config/database.js')

// Make an instance of Express
const app = express()

// Handle JSON requests
app.use(express.json())

// Setup express-session
const expressSession = session({
    secret: 'audl2018'
})

// Use the above settings above
app.use(expressSession)

// Load Socket.io to support real-time features
const server = require('http').Server(app)
const io = require('socket.io')(server)
// Share sessions between Express and Socket.io
const ioSession = require('express-socket.io-session')
// Setup session sharing between Express and Socket.io
io.use(ioSession(expressSession, {
    autoSave: true
}))

// In-memory list of users currently connected to the chat
let onlineUsers = []

// Stuff to do when a user (socket) connects to the site
io.on('connection', socket => {
    // Take the user object from the session
    // It contains the user's ID and username
    let { user } = socket.handshake.session

    // When a user closes the site
    // and therefore disconnects
    socket.on('disconnect', () => {
        // Check if the user is logged in
        if (user) {
            // Remove the users from the onlineUsers array
            onlineUsers = onlineUsers.filter(u => u.id !== user.id)

            // Emit the new list of online users
            io.emit('online users', onlineUsers)
        }
    })
    
    // If the user is logged in
    if (user) {
        // Check if the user is already on the list
        // Could happen if the user uses multiple browsers
        if (!onlineUsers.some(u => u.id == user.id)) {
            // If user is not on the list, add the user
            onlineUsers.push(user)

            // Attach the user to the socket
            socket.user = user
        }
    }

    io.emit('online users', onlineUsers)
})

// Serve public folder
app.use(express.static('public'))

// Authentication middleware
const requireAuthentication = (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: 'ERROR',
            message: 'Authentication required!'
        })
    }

    next()
}

// Manually check if user is logged in
// If not, redirect to login.html
app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login.html')
    }

    res.sendFile(__dirname + '/public/app.html')
})

// Endpoint to handle user authentication
app.post('/api/auth', (req, res) => {
    let { username, password } = req.body

    // Make sure username and password are present
    let schema = {
        username: Joi.string().alphanum().required(),
        password: Joi.string().required()
    }

    // Validate using Joi
    let result = Joi.validate(req.body, schema)

    // Return an error if validation failed
    if (result.error !== null) {
        return res.status(422).json({
            message: 'Invalid request'
        })
    }

    // Build query for looking up the user
    let query = {
        where: {
            username
        }
    }

    db.User.findOne(query)
    .then(user => {
        // Return an error if user was not found
        if (!user) {
            return res.status(422).json({
                status: 'ERROR',
                message: 'Invalid credentials'
            })
        }

        // Compare the found user's password with the submitted password
        // bcrypt encrypts the submitted and stores password
        bcrypt.compare(password, user.password)
        .then(result => {
            // If the comparison fails return an error
            if (!result) {
                return res.status(422).json({
                    status: 'ERROR',
                    message: 'Invalid credentials'
                })
            }

            // Otherwise set the session with the user's details
            req.session.user = {
                id: user.id,
                username: user.username
            }

            // Send a response
            res.json({
                status: 'OK',
                message: 'You have been authenticated!'
            })
        })
    })
})

// Endpoint to destroy the session's data
app.get('/api/auth/logout', (req, res) => {
    req.session.destroy()

    res.redirect('/')
})

// Endpoint to register a new user
app.post('/api/users', (req, res) => {
    let { username, password } = req.body

    let schema = {
        username: Joi.string().alphanum().required(),
        password: Joi.string().required()
    }

    const result = Joi.validate(req.body, schema)

    if (result.error !== null) {
        return res.status(422).json({
            status: 'ERROR',
            message: 'Validation failed'
        })
    }

    // Create the new user
    db.User.create({
        username,
        password
    })
    .then(user => {
        // HTTP 201 = Created
        res.status(201).json({
            status: 'OK',
            message: 'User created!'
        })
    })
    .catch(error => {
        res.status(422).json({
            status: 'ERROR',
            message: 'Error creating user!'
        })
    })
})

// Endpoint which returns ALL messages
// and the related user
app.get('/api/messages', (req, res) => {
    // Include the user related to the messages
    let options = {
        include: [{
            model: db.User,
            attributes: ['username'] // Only select the username column
        }]
    }

    db.Message.findAll(options)
    .then(messages => {
        res.json(messages)
    })
})

// Endpoint to save new messages
// Requires that the user is logged in
app.post('/api/messages', requireAuthentication, (req, res) => {
    let { text } = req.body

    let schema = {
        text: Joi.string().required()
    }

    let result = Joi.validate(req.body, schema)

    if (result.error !== null) {
        return res.status(422).json({
            status: 'ERROR',
            message: 'Missing text for message'
        })
    }

    // Create the message and take the userId from the session
    // Adding the userId associates the message to the user
    db.Message.create({
        text,
        userId: req.session.user.id
    }, {
        include: [{
            model: db.User,
            attributes: ['username']
        }]
    })
    .then(message => {
        // Select the message again with the associated user
        return message.reload()
    })
    .then(message => {
        // Emit the newly created message to all sockets
        io.emit('new message', message)

        // Return a HTTP 201 response
        return res.status(201).json({
            status: 'OK',
            message: 'Message created!'
        })
    })
    .catch(error => {
        res.status(422).json({
            status: 'ERROR',
            message: 'An error accured when creating message'
        })
    })
})

// Sync models to the database
// Note: You may want to set force to false so that
// data is not destroyed on server restart
db.sequelize.sync({ force: true }).then(() => {
    server.listen(3000, () => {
        db.User.create({
            username: 'bot',
            password: 'secret',
            messages: [
                { text: 'Hello World!'},
                { text: 'Hello World, once again!'},
                { text: 'Hello?' }
            ]
        }, {
            // Sequelize needs the related model to insert
            // related models, like the messages above
            // Documentation: http://docs.sequelizejs.com/manual/tutorial/associations.html#creating-with-associations
            include: [ db.Message ]
        })
        console.log('Database is ready and server is running..')
    })
})