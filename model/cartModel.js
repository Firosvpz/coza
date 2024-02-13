const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        status: {
            type: String,
            default: "placed"
        },
        cancellationReason: {
            type: String,
            default: "none"
        },
    }]
})

const cart = mongoose.model('cart', cartSchema)
module.exports = cart