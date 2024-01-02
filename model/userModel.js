const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    address: [
        {
            name: String,
            houseName:String,
            phoneNo:String,
            place:String,
            postcode:Number,
            state:String
        }
    ]
},
    {
        timestamps: true
    })

module.exports = mongoose.model("User", userSchema)