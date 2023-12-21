const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()

const userOtp = require('../model/userOtpModel')
const products = require('../model/productModel')
const categories = require('../model/categoryModel')



const homePage = async (req, res) => {
    try {
        // console.log('home',req.session.user_id);

        const userData = await User.findOne({ _id: req.session.user_id })
        res.render('home', { user: userData })


    } catch (error) {

        console.log(error.message);
    }
}

const registerUser = async (req, res) => {
    try {
        res.render('register')
    } catch (error) {
        console.log(error.message);
    }
}

const verifyRegister = async (req, res) => {
    try {
        const { username, email, mobileNumber, password, confirmPassword } = req.body
        // console.log(req.body);

        if (password !== confirmPassword) {
            req.flash('message', 'password do not match')
            res.redirect('/register')
        }


        const hashedPassword = await bcrypt.hash(password, 10)
        console.log("hashed Password", hashedPassword);

        // create new user
        const newUser = new User({
            username,
            email,
            mobileNumber,
            password: hashedPassword,
            verified: false,
        })

        await newUser.save()

        sendOtpverification(newUser, res)
        // res.redirect('/login')
    } catch (error) {
        console.log(error);
        req.flash('message', 'email already exist')
        res.redirect('/register')
    }

}

const loginUser = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email: email })
        // console.log(user);
        if (!user) {
            req.flash('message', 'incorrect email or password')
            res.redirect('/login')
        }
        const pswdMatch = await bcrypt.compare(password, user.password)
        if (!pswdMatch) {
            req.flash('message', 'incorrect email or password')
            res.redirect('/login')
        }
        req.session.user_id = user._id
        // console.log(req.body.user_id);
        res.redirect('/')

    } catch (error) {
        console.log(error);
    }

}

const sendOtpverification = async ({ email }, res) => {
    try {
        // const{email}=req.body
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: true,
            auth: {
                user: process.env.email_user,
                pass: 'zauj idfi rpke rskt'
            }
        })
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`
        console.log('email:', email);
        console.log('from:', process.env.email_user);
        const mailOptions = {
            from: process.env.email_user,
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

const loadOtp = async (req, res) => {
    try {
        const email = req.query.email

        res.render('loginOtp', { email: email })
    } catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    try {
        const email = req.body.email;
        console.log('email:',email);
        const otp = `${req.body.one}${req.body.two}${req.body.three}${req.body.four}`;
        
        console.log('otp:', otp);
        const user = await userOtp.findOne({ email: email })
        console.log("user:", user);


        if (!user) {
            res.render('loginOtp', { message: 'otp expired' })
        }
        const { otp: hashedOtp } = user;
        const validOtp = await bcrypt.compare(otp, hashedOtp)
        console.log(validOtp);

        if (validOtp === true) {
            const userData = await User.findOne({ email: email })
            await User.findByIdAndUpdate({ _id: userData._id }, { $set: { verified: true } })
            await userOtp.deleteOne({ email: email })

            req.session.user_id = userData._id

            res.redirect('/home')
        } else {
            res.render('loginOtp', { message: 'otp is incorrect' })
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loginOtp = async (req, res) => {
    try {
        res.render('email')
    } catch (error) {
        console.log(error);
    }
}

const verifyLoginOtp = async (req, res) => {
    try {
        const email = req.body.email
        // console.log('email',email);
        const user = await User.findOne({ email: email })
 
        console.log('user:', user);
        if (!user) {
            res.status(400).send({ error: "email does not exist" })
        }
        sendOtpverification(user, res)
        res.redirect(`/loginOtp?email=${email}`);


    } catch (error) {
        console.log(error);

    }
}

const logOut = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/')
    } catch (error) {
        console.log(error);

    }
}

const loadHome = async (req, res) => {
    try {
        res.render('home')

    } catch (error) {
        console.log(error);
    }
}

const shop = async (req, res) => {
    try {
        const categid = req.query.id
        if (categid) {
            data = await products.find({ isListed: true, category: categid })
        } else {
            data = await products.find({isListed:true})
        }

      const categdata = await categories.find({isListed:true})

        res.render('shop', { products: data, categories: categdata })

    } catch (error) {
        console.log(error);
    }
}

const cart = async (req, res) => {
    try {
        res.render('cart')

    } catch (error) {
        console.log(error);
    }
}

const contact = async (req, res) => {
    try {
        res.render('contact')

    } catch (error) {
        console.log(error);
    }
}

const about = async (req, res) => {
    try {
        res.render('about')

    } catch (error) {
        console.log(error);
    }
}

const productDetails = async (req, res) => {
    try {
        const id = req.query.id
        const data = await products.findOne({ _id: id })
        res.render('productdetails', { products: data })
    } catch (error) {
        console.log(error);
    }
}

const pagination = async (req,res)=>{
    try {
        const page = req.query.page 
        const PrdctPerPage = 3
        let prdct = []
        
        products.

    } catch (error) {
        
    }
}
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
    cart,
    about,
    contact,
    productDetails

}