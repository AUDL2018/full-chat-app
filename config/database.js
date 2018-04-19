const Sequelize = require('sequelize')
const bcrypt = require('bcrypt')

const sequelize = new Sequelize('sqlite:./data/database.sqlite', {
    logging: false
})

// Custom function to hash password attribute
// on User model
const hashPassword = (user, options) => {
    return bcrypt.hash(user.password, 10)
    .then(hash => {
        user.password = hash
    })
    .catch(error => {
        throw new Error(error)
    })
}

const db = {}

db.User = sequelize.define('user', {
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

db.Message = sequelize.define('message', {
    text: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

// Model associations
db.User.hasMany(db.Message)
db.Message.belongsTo(db.User)

// Make sure password is hashed
// when user is created and updated
db.User.beforeCreate(hashPassword)
db.User.beforeUpdate(hashPassword)

db.sequelize = sequelize

module.exports = db