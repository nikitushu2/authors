const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 3
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Author'
        }
    ],
    favoriteGenre: { type: String }
})

module.exports = mongoose.model('User', schema)