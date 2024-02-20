const mongoose = require('mongoose')


const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    order_id: {
        type: String,
    },
    delivery_address: {
        type: String,
        required: true
    },
    user_name: {
        type: String,
        required: true
    },
    total_amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    expected_delivery: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    payment: {
        type: String,
        required: true
    },
    paymentId: {
        type: String
    },
    totalDiscountAmount: {
        type: Number,

    },
    couponApplied: {
        type: Boolean,
        
    },
    coupon_name: {
        type: String,
    },
    items: [{
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price:{
            type:Number,
            required:true
        },
        total_price:{
            type:Number,
            required:true
        },
        couponDiscountTotal:{
            type:Number,
            default:0
        },
        ordered_status: {
            type: String,
            default: "placed"
        },
        cancellationReason: {
            type: String
        },
    }]
})

module.exports = mongoose.model("Orders", orderSchema)