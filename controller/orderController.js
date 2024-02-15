const Cart = require('../model/cartModel')
const products = require('../model/productModel')
const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const Order = require('../model/orderModel')
const Coupon = require('../model/couponModel')
const moment = require('moment')
const razorpay = require("razorpay");
const path = require('path')
const ejs = require('ejs')
const puppeteer = require("puppeteer");

//................................................................................................................................//

var instance = new razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

//................................................................................................................................//

const placeOrder = async (req, res) => {
    try {
        const date = new Date();
        const userId = req.session.user_id;
        const { address, paymentMethod, subTotal, CouponDiscTotal } = req.body.orderData;

        let couponApply = false;
        let couponName;

        const couponData = req.session.coupon;
        let id;

        if (couponData) {
            id = couponData._id;
            couponName = couponData.couponCode;
        }

        const randomNum = Math.floor(10000 + Math.random() * 90000);

        const orderID = "CZST" + randomNum;

        // Wallet
        if (paymentMethod === "Wallet") {
            const user = await User.findById(userId);

            // Check if wallet balance is sufficient
            if (user.wallet < subTotal) {
                return res.json({
                    walletFailed: true,
                    message: "Insufficient wallet balance.",
                });
            }
            const status = "placed";

            // Deduct order amount from wallet
            user.wallet -= subTotal;

            // Update wallet history
            user.wallet_history.push({
                date: new Date(),
                amount: -subTotal,
                description: "Order placed",
            });

            await user.save();

            const userData = await User.findOne({ _id: userId });
            let cartData;
            let cartProducts;
            if (req.session.couponApplied === true) {

                couponApply = true;

                const updateCouponUsed = await Coupon.updateOne(
                    { _id: id },
                    { $push: { userUsed: { user_id: userId } } }
                );
                await Coupon.updateOne(
                    { _id: id },
                    { $inc: { Availability: -1 } }
                );

                const couponDiscount = req.session.discountAmount || 0;

                cartData = await Cart.findOne({ user_id: userId });
                cartProducts = cartData.items;


                const totalQuantity = cartProducts.reduce((total, item) => total + item.quantity, 0);

                for (let i = 0; i < cartProducts.length; i++) {
                    const item = cartProducts[i];
                    const discountFraction = item.quantity / totalQuantity;
                    const itemDiscount = Math.round(couponDiscount * discountFraction);

                    cartProducts[i].discountAmount = itemDiscount;

                    cartProducts[i].couponDiscountTotal += itemDiscount;
                }

                req.session.couponApplied = false;

            } else {
                cartData = await Cart.findOne({ user_id: userId });
                cartProducts = cartData.items;
            }
            const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
            const deliveryDate = delivery
                .toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                })
                .replace(/\//g, "-");


            const order = new Order({
                user_id: userId,
                order_id: orderID,
                delivery_address: address,
                user_name: userData.username,
                total_amount: subTotal,
                totalDiscountAmount: CouponDiscTotal,
                coupon_name: couponName,
                date: date,
                status: status,
                expected_delivery: deliveryDate,
                couponApplied: couponApply,
                payment: paymentMethod,
                items: cartProducts,
            });

            let orderData = await order.save();

            const orderId = orderData._id;
            await Cart.deleteOne({ user_id: userId });

            for (let i = 0; i < cartData.items.length; i++) {
                const productId = cartProducts[i].product_id;
                const count = cartProducts[i].quantity;
                await products.updateOne(
                    { _id: productId },
                    { $inc: { quantity: -count } }
                );
            }

            return res.json({ success: true, params: orderId });
        }
        const status = paymentMethod === "COD" ? "placed" : "pending";
        const userData = await User.findOne({ _id: userId });
        let cartData;
        let cartProducts;

        if (req.session.couponApplied === true) {
            console.log('NKGHYFGT VLOG');
            couponApply = true;

            const updateCouponUsed = await Coupon.updateOne(
                { _id: id },
                { $push: { userUsed: { user_id: userId } } }
            );
            await Coupon.updateOne(
                { _id: id },
                { $inc: { Availability: -1 } }
            );

            const couponDiscount = req.session.discountAmount || 0;


            cartData = await Cart.findOne({ user_id: userId });
            if (!cartData || !cartData.items) {
                // Handle the case where cartData or cartData.items is null
                return res.json({
                    success: false,
                    message: "Cart data not found or empty.",
                });
            }

            cartProducts = cartData.items;


            const totalQuantity = cartProducts.reduce((total, item) => total + item.quantity, 0);


            for (let i = 0; i < cartProducts.length; i++) {
                const item = cartProducts[i];
                const discountFraction = item.quantity / totalQuantity;
                const itemDiscount = Math.round(couponDiscount * discountFraction);

                cartProducts[i].discountAmount = itemDiscount;

                cartProducts[i].couponDiscountTotal = itemDiscount;
            }
            req.session.couponApplied = false;

        } else {

            cartData = await Cart.findOne({ user_id: userId });

            if (!cartData || !cartData.items) {
                // Handle the case where cartData or cartData.items is null
                return res.json({
                    success: false,
                    message: "Cart data not found or empty.",
                });
            }
            cartProducts = cartData.items;

        }

        const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
        const deliveryDate = delivery
            .toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            })
            .replace(/\//g, "-");

        const order = new Order({
            user_id: userId,
            order_id: orderID,
            delivery_address: address,
            user_name: userData.username,
            total_amount: subTotal,
            totalDiscountAmount: CouponDiscTotal,
            coupon_name: couponName,
            date: date,
            status: status,
            expected_delivery: deliveryDate,
            couponApplied: couponApply,
            payment: paymentMethod,
            items: cartProducts,
        });
        let orderData = await order.save();
        const orderId = orderData._id;

        if (orderData.status === "placed") {
            await Cart.deleteOne({ user_id: userId });


            for (let i = 0; i < cartData.items.length; i++) {
                const productId = cartProducts[i].product_id;
                const count = cartProducts[i].quantity;

                await products.updateOne(
                    { _id: productId },
                    { $inc: { quantity: -count } }
                );
            }
            res.json({ success: true, params: orderId });
        } else {

            const orderid = orderData._id;
            const total = orderData.total_amount;

            var options = {
                amount: total * 100, // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderid,
            };

            instance.orders.create(options, function (err, order) {
                console.log(order);
                return res.json({ success: false, order: order });
            });

        }

    } catch (error) {
        console.log(error);
    }
};
//................................................................................................................................//

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const { user_id } = req.session;
        const couponData = await Coupon.findOne({ couponCode: couponCode });

        req.session.coupon = couponData;
        let discountedTotal = 0;
        if (couponData) {
            let currentDate = new Date();
            let minAmount = couponData.minAmount;

            if (cartTotal >= couponData.minAmount) {
                if (
                    currentDate <= couponData.expiryDate &&
                    couponData.status !== false

                ) {
                    const id = couponData._id;
                    const couponUsed = await Coupon.findOne({
                        _id: id,
                        "userUsed.user_id": user_id,
                    });

                    if (couponUsed) {
                        res.send({ usedCoupon: true });
                    } else {
                        console.log("COupon not used");
                        if (req.session.couponApplied === false) {

                            if (couponData.Availability <= 0) {
                                // Update the status to expired
                                await Coupon.updateOne({ _id: couponData._id }, { $set: { status: false } });
                                return res.send({ expired: true });
                            }
                            req.session.couponApplied = true;
                            req.session.discountAmount = couponData.discountAmount;

                            res.send({
                                couponApplied: true,
                                discountAmount: req.session.discountAmount,
                            });
                        } else {
                            console.log("COuponData true");
                            res.send({ onlyOneTime: true });
                        }
                    }
                } else {
                    console.log("Coupon expired");
                    res.send({ expired: true });
                }
            } else {
                console.log(`you should purchase atleast ${cartTotal}`);
                res.send({ shouldMinAmount: true, minAmount });
            }
        } else {
            console.log("Wrong Coupon");
            res.send({ wrongCoupon: true });
        }
        console.log("coupondata", couponData);
    } catch (error) {
        console.log(error.message);
    }
};
//................................................................................................................................//
const verifyPayment = async (req, res) => {
    try {
        const cartData = await Cart.findOne({ user_id: req.session.user_id });
        const cartProducts = cartData.items;
        const details = req.body;

        const crypto = require("crypto");
        // Your secret key from the environment variable
        const secretKey = process.env.RAZORPAY_SECRET_KEY;

        // Creating an HMAC with SHA-256
        const hmac = crypto.createHmac("sha256", secretKey);

        // Updating the HMAC with the data
        hmac.update(
            details.payment.razorpay_order_id +
            "|" +
            details.payment.razorpay_payment_id
        );

        // Getting the hexadecimal representation of the HMAC
        const hmacFormat = hmac.digest("hex");

        if (hmacFormat == details.payment.razorpay_signature) {
            await Order.findByIdAndUpdate(
                { _id: details.order.receipt },
                { $set: { paymentId: details.payment.razorpay_payment_id } }
            );

            for (let i = 0; i < cartProducts.length; i++) {
                let count = cartProducts[i].quantity; await products.findByIdAndUpdate({
                    _id: cartProducts[i].product_id
                },
                    { $inc: { quantity: -count } });
            }


            await Order.findByIdAndUpdate({ _id: details.order.receipt }, { $set: { status: "placed" } });


            const userData = await User.findOne({ _id: req.session.user_id });
            await Cart.deleteOne({ user_id: userData._id });

            res.json({ success: true, params: details.order.receipt });
        } else {
            await Order.findByIdAndDelete({ _id: details.order.receipt });
            res.json({ success: false });
        }
    } catch (error) {
        console.log(error.message);
    }
};
//................................................................................................................................//

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
//................................................................................................................................//

const orderList = async (req, res) => {
    try {
        const id = req.session.user_id;
        const page = parseInt(req.query.page) || 1;
        const perPage = 3;

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
//................................................................................................................................//

const viewOrder = async (req, res) => {
    try {
        req.session.couponApplied = false;
        req.session.discountAmount = 0;

        const userId = req.session.user_id
        const orderId = req.query.orderId

        const mainOrder = await Order.findOne({ _id: orderId, user_id: userId }).populate({
            path: "items.product_id",
            populate: {
                path: 'offer'
            }
        });
        const categData = await categories.find({ isListed: true }).populate('offer');
        const user = await User.findOne({ _id: userId })
        res.render('viewOrder', { order: mainOrder, user, moment, categories: categData })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const loadProfileAddress = async (req, res) => {
    try {
        const userId = req.session.user_id
        const data = await User.findOne({ _id: userId })
        res.render('address', { user: data })

    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const invoiceDownload = async (req, res) => {
    try {
        const { orderId } = req.query;
        const { user_id } = req.session;
        let sumTotal = 0;

        const userData = await User.findById(user_id);
        const orderData = await Order.findById(orderId).populate('items.product_id');

        orderData.items.forEach((item) => {
            const total = item.product_id.price * item.quantity;
            sumTotal += total;
        });

        const date = new Date();
        const data = {
            order: orderData,
            user: userData,
            date,
            sumTotal,
            moment
        };

        // Render the EJS template
        const ejsTemplate = path.resolve(__dirname, '../views/user/invoice.ejs');
        const ejsData = await ejs.renderFile(ejsTemplate, data);

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(ejsData, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

        // Close the browser
        await browser.close();

        // Set headers for inline display in the browser
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=order_invoice.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};
//................................................................................................................................//

module.exports = {
    orderPage,
    placeOrder,
    orderList,
    loadProfileAddress,
    viewOrder,
    verifyPayment,
    applyCoupon,
    invoiceDownload
}   