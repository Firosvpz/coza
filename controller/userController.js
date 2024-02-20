const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const userOtp = require('../model/userOtpModel')
const products = require('../model/productModel')
const Categories = require('../model/categoryModel')
const { usersList, listCategory } = require('./adminController')
const Order = require('../model/orderModel')
const bannerModel = require('../model/bannerModel')
dotenv.config()
const session = require('express-session')

//................................................................................................................................//

const homePage = async (req, res) => {
    try {
        const id = req.session.user_id;
        const userData = await User.findOne({ _id: id });
        const banner = await bannerModel.find({ status: true })
        const latestProducts = await products.find().sort({ _id: 1 }).limit(4).populate({
            path: 'offer',
        })

        const categories = await Categories.find({}).populate('offer')

        const orders = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product_id',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total_price' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 4 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    _id: '$productDetails._id',
                    name: '$productDetails.name',
                    totalQuantity: 1,
                    totalRevenue: 1

                }
            }
        ])
        const orderProductIds = orders.map(order => order._id);

        const topProducts = await products.find({ _id: { $in: orderProductIds } })
            .sort({ _id: -1 })
            .limit(4)
            .populate({
                path: 'offer',
            })

        // Sort products by totalQuantity in descending order
        const topDeals = topProducts.sort((a, b) => {
            const aQuantity = orders.find(order => order._id.equals(a._id)).totalQuantity;
            const bQuantity = orders.find(order => order._id.equals(b._id)).totalQuantity;
            return bQuantity - aQuantity;
        });

        req.session.couponApplied = false;
        req.session.discountAmount = 0;

        res.render("home", { user: userData, currentRoute: '/', banner, latestProducts, topDeals, categories });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}
//................................................................................................................................//

const registerUser = async (req, res) => {
    try {
        const { code } = req.query;
        res.render('register', { code });

    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const verifyRegister = async (req, res) => {
    try {
        const { username, email, mobileNumber, password, confirmPassword,code } = req.body
        console.log('code:',code);
        if (code) {
            req.session.referralCode = code;
        }
        if (password !== confirmPassword) {
            req.flash('message', 'password do not match')
            res.redirect('/register')
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const referralCode = generateReferralCode();
        // create new user
        const newUser = new User({
            username,
            email,
            mobileNumber,
            password: hashedPassword,
            verified: false,
            referralCode: referralCode
        })
        await newUser.save()

        sendOtpverification(newUser, res)

    } catch (error) {
        console.log(error);
        req.flash('message', 'email already exist')
        res.redirect('/register')
    }
}
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

//................................................................................................................................//

const loginUser = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email: email })
        const data = await User.findOne({ email: email, isBlocked: true })

        if (!user) {
            req.flash('message', 'User not found')
            res.redirect('/login')
        }
        const pswdMatch = await bcrypt.compare(password, user.password)
        if (!pswdMatch) {
            req.flash('message', 'incorrect password')
            res.redirect('/login')
        }
        if (data) {
            req.flash('message', 'cannot login because you are in blocklist')
            res.redirect('/login')
        }
        req.session.user_id = user._id
        res.redirect('/')

    } catch (error) {
        console.log(error);
    }

}
//................................................................................................................................//

const sendOtpverification = async ({ email }, res) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: true,
            auth: {
                user: 'vpzfiroz@gmail.com',
                pass: 'bnmb pjrd ikhw jkis'
            }
        })
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`
        const mailOptions = {
            from: 'vpzfiroz@gmail.com',
            to: email,
            subject: 'Verify Your Email',

            html: `
                <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #3498db;">Email Verification</h2>
                    <p style="color: #555; font-size: 16px;">Dear User,</p>
                    <p style="color: #555; font-size: 16px;">Thank you for signing up. To complete your registration, please verify your email by entering the OTP below:</p>
                    <div style="background-color: #f2f2f2; padding: 10px; margin: 20px auto; max-width: 200px; border-radius: 5px;">
                        <h3 style="color: #333; font-size: 20px;">${otp}</h3>
                    </div>
                    <p style="color: #555; font-size: 16px;">This OTP is valid for a limited time. Please do not share it with anyone.</p>
                    <p style="color: #555; font-size: 16px;">Thank you for choosing our service!</p>
                    <p style="color: #777; font-size: 14px;">Best Regards,<br>Firos</p>
                </div>
            `
        };

        // hash otp
        const saltrounds = 10
        const hashedOtp = await bcrypt.hash(otp, saltrounds)
        const newOtpVerification = await new userOtp({
            email: email,
            otp: hashedOtp,
            createdAt: new Date()
        })
        // save otp record
        await newOtpVerification.save()
        await transporter.sendMail(mailOptions)
        res.redirect(`/loginOtp?email=${email}`)
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const loadOtp = async (req, res) => {
    try {
        const email = req.query.email
        res.render('loginOtp', { email: email })
    } catch (error) {

    }
}
//................................................................................................................................//

const verifyOtp = async (req, res) => {
    try {
        const email = req.body.email;
        const otp = `${req.body.one}${req.body.two}${req.body.three}${req.body.four}`;

        const user = await userOtp.findOne({ email: email })

        if (!user) {
            res.render('loginOtp', { message: 'otp expired' })
        }
        const { otp: hashedOtp } = user;
        const validOtp = await bcrypt.compare(otp, hashedOtp)

        if (validOtp === true) {
            const userData = await User.findOne({ email: email })
            await User.findByIdAndUpdate({ _id: userData._id }, { $set: { verified: true } })
            await userOtp.deleteOne({ email: email })

            req.session.user_id = userData._id
            // console.log('id:',req.session.user_id);
            if (req.session.referralCode) {
                await User.findOneAndUpdate(
                    { referralCode: req.session.referralCode },
                    {
                        $inc: { wallet: 100 },
                        $push: {
                            wallet_history: {
                                date: new Date(),
                                amount: 100,
                                description:`Referral Bonus for referring  ${userData.username}`
                            }
                        }
                    }
                );
                await User.findOneAndUpdate(
                    { _id: req.session.user_id },
                    {
                        $inc: { wallet: 50 },
                        $push: {
                            wallet_history: {
                                date: new Date(),
                                amount: 50,
                                description: `Welcome Bonus For using referral link`
                            }
                        }
                    }
                );
            }
            req.session.referralCode = null;
            req.session.user_id = null
            
            res.redirect('/home')
        } else {
            res.render('loginOtp', { message: 'otp is incorrect' })
        }
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const loginOtp = async (req, res) => {
    try {
        res.render('email')
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const verifyLoginOtp = async (req, res) => {
    try {
        const email = req.body.email
        const user = await User.findOne({ email: email })

        if (!user) {
            res.status(400).send({ error: "email does not exist" })
        }
        sendOtpverification(user, res)
        res.redirect(`/loginOtp?email=${email}`);
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const resendOtp = async (req, res) => {
    const email = req.query.email;
    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(400).send({ error: "Email does not exist" });
        }
        // Call your function to send the OTP again
        sendOtpverification(user, res);
        res.redirect('/loginotp')
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Something went wrong while resending OTP" });
    }
}
//................................................................................................................................//

const logOut = async (req, res) => {
    try {
        req.session.couponApplied = false;
        req.session.discountAmount = 0;
        req.session.destroy()
        res.redirect('/')
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const loadHome = async (req, res) => {
    try {
        res.render('home')
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const PRODUCTS_PER_PAGE = 8;
const shop = async (req, res) => {
    try {
        let user;
        let data;

        if (req.session.user_id) {
            const id = req.session.user_id;
            user = await User.findOne({ _id: id });
        }

        const categoryId = req.query.categoryId;

        let categoryData = await Categories.find({ isListed: true });
        const ListedCategory = categoryData.map(categ => categ.categoryName);

        const page = parseInt(req.query.page) || 1;
        const searchTerm = req.query.search;
        const priceFrom = parseFloat(req.query.priceFrom);
        const priceTo = parseFloat(req.query.priceTo);
        const priceSort = req.query.priceSort;

        // Define the base query for listed products
        const baseQuery = {
            isListed: true,
        };

        // If a category is specified, include it in the query
        if (categoryId) {
            baseQuery.category = categoryId;

        }

        // Extend the query conditions based on the search term
        if (searchTerm) {
            baseQuery.name = { $regex: new RegExp(searchTerm, 'i') };
        }

        // Further filter products based on price range
        if (!isNaN(priceFrom) && !isNaN(priceTo)) {
            baseQuery.price = { $gte: priceFrom, $lte: priceTo };
        }

        // Extend the query conditions based on the sorting option
        const sort = {};
        if (priceSort) {
            sort.price = (priceSort === 'asc') ? 1 : -1;
        }

        // Calculate the total number of pages
        const totalProducts = await products.countDocuments(baseQuery);
        const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

        // Perform pagination on the listed products
        const paginatedProducts = await products.find(baseQuery).populate('offer')
            .sort(sort)
            .skip((page - 1) * PRODUCTS_PER_PAGE)
            .limit(PRODUCTS_PER_PAGE);

        // Populate the offer field for each category
        const populatedCategories = await Promise.all(categoryData.map(async (category) => {
            const categoryWithOffer = await Categories.findById(category._id).populate('offer');
            return categoryWithOffer;
        }));

        if (req.xhr) {
            res.json({ success: true, data: paginatedProducts, categories: populatedCategories });
        } else {
            // If it's a regular request, render the 'shop' view
            res.render('shop', {
                products: paginatedProducts,
                user,
                req,
                totalPages,
                categories: populatedCategories
            });
        }
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const contact = async (req, res) => {
    try {
        const id = req.session.user_id;
        const user = await User.findOne({ _id: id });
        res.render('contact', { user })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const about = async (req, res) => {
    try {
        const id = req.session.user_id;
        const user = await User.findOne({ _id: id });
        res.render('about', { user })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const productDetails = async (req, res) => {
    try {
        req.session.couponApplied = false;
        req.session.discountAmount = 0;

        let user;
        if (req.session.userId) {
            const id = req.session.userId;
            user = await User.findOne({ _id: id });
        }
        const id = req.query.id
        const data = await products.findOne({ _id: id }).populate('offer')

        const categories = await Categories.find({ isListed: true }).populate('offer');
        res.render('productdetails', { products: data, user, categories })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const userProfile = async (req, res) => {
    try {
        const id = req.session.user_id;
        const user = await User.findOne({ _id: id });
        res.render('profile', { user });
    } catch (error) {
        console.log(error);
    }
};
//................................................................................................................................//

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user_id; // Assuming the correct session key is used to store the user ID
        const { username, mobileNumber } = req.body;
        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    username,
                    mobileNumber
                }
            },
            { new: true }
        );

        res.redirect('/profile');
    } catch (error) {
        console.log(error);
    }
};
//................................................................................................................................//

const profileUser = async (req, res) => {
    try {
        const id = req.session.user_id;
        if (!id) {
            res.redirect('/login')
        }
        const user = await User.findOne({ _id: id });
        res.render('userprofile', { user })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const editAddress = async (req, res) => {
    try {
        const userid = req.session.user_id;
        console.log(userid);
        const { id, name, house, phone, state } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { _id: userid, "address._id": id },
            {
                $set: {
                    "address.$.name": name,
                    "address.$.housename": house,
                    "address.$.phone": phone,
                    "address.$.state": state,
                },
            },
            { new: true } // Return the updated document
        );
        res.json({ edited: true });
    } catch (err) {
        console.log(err.message);
    }
};
//................................................................................................................................//

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { Addid } = req.body;
        await User.updateOne(
            { _id: userId },
            { $pull: { address: { _id: Addid } } }
        );
        res.json({ deleted: true });
    } catch (err) {
        console.log(err.message);
    }
};
//................................................................................................................................//

const loadPassword = async (req, res) => {
    try {
        const user = req.session.user_id;
        res.render('password', { user: user })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user_id
        const user = await User.findOne({ _id: userId })
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (passwordMatch) {
            if (newPassword == confirmPassword) {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await User.findByIdAndUpdate(userId, { $set: { password: hashedPassword } });
                res.redirect('/userprofile')
            }
            else {
                return res.status(401).json({ error: "passwords do not match" });
            }
        } else {
            return res.status(401).json({ error: "Invalid old password" });
        }
    } catch (error) {
        console.log();
    }
}
//................................................................................................................................//

const cancelOrder = async (req, res) => {
    const orderId = req.body.orderId;
    const itemId = req.body.itemId;
    const reason = req.body.reason;
    const returnReason = req.body.returnReason;
    try {
        if (reason) {
            const updatedOrder = await Order.updateOne(
                { _id: orderId, 'items._id': itemId },
                {
                    $set: {
                        'items.$.ordered_status': 'request_cancellation',
                        'items.$.cancellationReason': reason
                    }
                }
            );
            
            res.status(200).json({ message: 'Order cancellation requested', order: updatedOrder });
        }
        if (returnReason) {
            const updatedOrder = await Order.updateOne(
                { _id: orderId, 'items._id': itemId },
                {
                    $set: {
                        'items.$.ordered_status': 'request_return',
                        'items.$.cancellationReason': reason
                    }
                }
            );
            
            res.status(200).json({ message: 'Order return requested', order: updatedOrder });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
//................................................................................................................................//

const loadWallet = async (req, res) => {
    try {
        req.session.couponApplied = false;
        req.session.discountAmount = 0;

        const userId = req.session.user_id;
        const user = await User.findOne({ _id: userId });
        res.render('wallet', { user });
    } catch (error) {
        console.log(error.message);
    }
};
//................................................................................................................................//

module.exports = {
    homePage,
    registerUser,
    loginUser,
    verifyRegister,
    verifyLogin,
    sendOtpverification,
    loadOtp,
    verifyOtp,
    verifyLoginOtp,
    loginOtp,
    logOut,
    loadHome,
    shop,
    about,
    contact,
    productDetails,
    userProfile,
    editProfile,
    profileUser,
    loadPassword,
    changePassword,
    cancelOrder,
    resendOtp,
    editAddress,
    deleteAddress,
    loadWallet
}