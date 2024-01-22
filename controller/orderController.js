const Cart = require('../model/cartModel')
const products = require('../model/productModel')
const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const Order = require('../model/orderModel')
const moment = require('moment')



const placeOrder = async (req, res) => {
    try {
        const date = new Date();
        const userId = req.session.user_id;
        const { address, paymentMethod } = req.body.orderData;
        console.log(address);

        const cartData = await Cart.findOne({ user_id: userId });
        const userData = await User.findById({ _id: userId });
        const cartProducts = cartData.items;

        const status = paymentMethod === "COD" ? "placed" : "pending";
        const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
        const deliveryDate = delivery
            .toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            })
            .replace(/\//g, "-");

        const totalAmount = cartProducts.reduce((total, product) => {
            const itemTotal = product.price * product.quantity;
            return total + itemTotal;
        }, 0);

        console.log('Total Amount:', totalAmount); // Log

        const randomNum = Math.floor(10000 + Math.random() * 90000);

        const orderID = "CZST" + randomNum;

        const order = new Order({
            user_id: userId,
            order_id: orderID,
            delivery_address: address,
            user_name: userData.username,
            total_amount: totalAmount,
            date: Date.now(),
            status: status,
            expected_delivery: deliveryDate,
            payment: paymentMethod,
            items: cartProducts,
        });

        let orderData = await order.save();
        const orderId = orderData._id;

        if (orderData.status === "placed") {
            await Cart.deleteOne({ user_id: userId });
        }

        for (let i = 0; i < cartData.items.length; i++) {
            const productId = cartProducts[i].product_id;
            const count = cartProducts[i].quantity;

            await products.updateOne(
                { _id: productId },
                { $inc: { quantity: -count } }
            );
        }
        res.json({ success: true, params: orderId });
    } catch (error) {
        console.log(error);
    }
};




const orderPage = async (req, res) => {
    try {
        
        const userid = req.session.user_id
        const id = req.params.id
        const orders = await Order.findOne({ _id: id })
        const user = await User.findOne({ _id: userid })


        res.render('orderPage', { user: user, orders: orders, moment })

    } catch (error) {
        console.log(error);
    }

}
const orderList = async (req, res) => {
    try {
        const id = req.session.user_id;
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const perPage = 3; // Adjust as needed

        // Count total number of orders
        const totalOrders = await Order.countDocuments({ user_id: id });

        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / perPage);

        // Ensure the requested page is within valid range
        if (page < 1 || page > totalPages) {
            return res.status(404).render('error', { error: 'Page not found' });
        }

        // Sort the orders in descending order based on the date field and paginate the results
        const data = await Order.find({ user_id: id })
            .sort({ date: -1 })
            .populate('items.product_id')
            .skip((page - 1) * perPage)
            .limit(perPage);

        const user = await User.find({ _id: id });

        res.render('orderlist', { orders: data, user, moment, currentPage: page, totalPages });
    } catch (error) {
        console.log(error);
        // Handle errors as needed
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
};



const viewOrder =async (req,res)=>{
    try {
        const userId = req.session.user_id
        const orderId = req.query.orderId
        
        const mainOrder = await Order.findOne({ _id: orderId, user_id: userId }).populate('items.product_id');
        const user = await User.findOne({ _id: userId })
        // console.log('mainOrder:',mainOrder);
        res.render('viewOrder', { order: mainOrder, user, moment })

    } catch (error) {
        console.log(error);
    }
}

const loadProfileAddress = async (req,res)=>{
    try {

        const userId = req.session.user_id
        const data = await User.findOne({_id:userId})
        res.render('address',{user:data})
        
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    orderPage,
    placeOrder,
    orderList,
    loadProfileAddress,
    viewOrder
}   