const Cart = require('../model/cartModel')
const products = require('../model/productModel')
const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const Order = require('../model/orderModel')
const moment = require('moment')



const placeOrder = async (req, res) => {  
    try {
        console.log(req.body,'iam reqbidy');
        const date = new Date()
        const userId = req.session.user_id
        const { address, paymentMethod } = req.body.orderData
        console.log(address);
        const cartData = await Cart.findOne({ user_id: userId })
        const userData = await User.findById({ _id: userId })
        const cartProducts = cartData.items

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
            order_id:orderID,
            delivery_address: address,
            user_name: userData.username,
            total_amount: totalAmount,
            date: Date.now(),
            status: status,
            expected_delivery: deliveryDate,
            payment: paymentMethod,
            items: cartProducts
        })

        let orderData = await order.save()
        const orderId = orderData._id

        if (orderData.status === "placed") {
            await Cart.deleteOne({ user_id: userId })
            res.json({ success: true, params: orderId })
        }



    } catch (error) {
        console.log(error);
    }
}



const orderPage = async (req, res) => {
    try {
        const userId = req.session.user_id

        // cart details
        if (!userId) {
            res.redirect('/login')

        } else {
            const cartDetails = await Cart.findOne({ user_id: userId }).populate({ path: 'items.product_id' })
            const user = await User.findOne({ _id: userId })

            let amount = 0
            if (cartDetails) {
                cartDetails.items.forEach((cartItem => {
                    let itemPrice = cartItem.price
                    amount += itemPrice * cartItem.quantity
                }))
            }
            let allProductsTotal = 0;

            if (cartDetails) {
                cartDetails.items.forEach((cartItem => {
                    allProductsTotal += cartItem.total_price;
                }));
            }
            const orderData = await Order.findOne({ user_id: userId })


            res.render('orderPage', { cart: cartDetails, user, subTotal: amount, total: allProductsTotal, order: orderData, moment })
        }

    } catch (error) {
        console.log(error);
    }
}


const orderList = async (req, res) => {
    try {
        const id = req.session.user_id
        const data = await Order.findOne({ user_id: id })
        console.log('data', data);
        res.render('orderlist', { order: data ,moment})
    } catch (error) {
        console.log(error);
    }
}

const viewOrder =async (req,res)=>{
    try {
        const userId = req.session.user_id
        const orderId = req.query.orderId

        const mainOrder = await Order.findOne({ _id: orderId, user_id: userId }).populate('items.product_id');
        const user = await User.findOne({ _id: userId })

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
const deleteAddress = async (req,res)=>{
    try {
        const data = req.body.addressId
        console.log('id:', data);
        const id = req.session.user_id
        const userCart = await Order.findOne({ user_id: id })

        const deletedProduct = await Order.updateOne(
            { _id: userCart },
            { $pull: { items: { order_id: data } } }
        );

        console.log('deleted product', deletedProduct);

        if (deletedProduct.nModified > 0) {
            res.json({ success: true, message: 'address deleted successfully' });
        } else {
            res.json({ success: false, message: 'address not found or could not be deleted' });
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    orderPage,
    placeOrder,
    orderList,
    loadProfileAddress,
    deleteAddress,
    viewOrder
}   