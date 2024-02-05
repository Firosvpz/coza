const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,

    },
    category: {
        type: String,
        required: true
    },
    images: {
        type: [],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },

    date: {
        type: String,


    },
    isListed: {
        type: Boolean,
        default: true
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "offer"
    },
    offerPrice: {
        type: Number
    }

}, {
    timestamps: true
}
)

module.exports = mongoose.model('products', productSchema)