const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config()

const userOtp = require('../model/userOtpModel')
const products = require('../model/productModel')
const categories = require('../model/categoryModel')
const { usersList } = require('./adminController')




const homePage = async (req, res) => {
    try {
        const userData = await User.findOne({ _id: req.session.user_id });

        if (userData) {
            res.render('home', { user: userData });
        } else {
            // Handle case when user data is not found
            res.render('home', { user: null }); // or handle differently as needed
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
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
        const data = await User.findOne({ email: email, isBlocked: true })
        console.log(data);
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
        console.log('email:', email);
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
        const id = req.session.user_id;


        const user = await User.findOne({ _id: id });

        const categid = req.query.id
        if (categid) {
            data = await products.find({ isListed: true, category: categid })
        } else {
            data = await products.find({ isListed: true })
        }



        const categdata = await categories.find({ isListed: true })

        res.render('shop', { products: data, categories: categdata, user })

    } catch (error) {
        console.log(error);
    }
}

const contact = async (req, res) => {
    try {
        const id = req.session.user_id;
        console.log('user', id);

        const user = await User.findOne({ _id: id });

        res.render('contact', { user })

    } catch (error) {
        console.log(error);
    }
}

const about = async (req, res) => {
    try {
        const id = req.session.user_id;
        console.log('user', id);

        const user = await User.findOne({ _id: id });
        res.render('about', { user })

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

const pagination = async (req, res) => {
    const { page, limit } = req.query;

    try {
        const products = await products.find()
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .exec();

        res.json(products);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};

const userProfile = async (req, res) => {
    try {
        const id = req.session.user_id;
        console.log('user', id);

        const user = await User.findOne({ _id: id });
        res.render('profile', { user });
    } catch (error) {
        console.log(error);
    }
};

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user_id; // Assuming the correct session key is used to store the user ID
        console.log('session:', userId);

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
        // Handle the error appropriately (e.g., send an error response)
    }
};

const profileUser = async (req, res) => {
    try {
        const id = req.session.user_id;


        const user = await User.findOne({ _id: id });
        res.render('userprofile', { user })
    } catch (error) {
        console.log(error);
    }
}

const loadPassword=async(req,res)=>{
    try {
        const user=req.session.user_id;
        res.render('password',{user:user})
    } catch (error) {
        console.log(error);
    }
}


const changePassword=async(req,res)=>{
    try {
      const  {currentPassword,newPassword,confirmPassword}=req.body;
      console.log(req.body);
      const userId=req.session.user_id
      const user=await User.findOne({_id:userId})
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if(passwordMatch)
      {
        if(newPassword==confirmPassword)
        {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.findByIdAndUpdate(userId, { $set: { password: hashedPassword } });
            res.redirect('/userprofile')
        }
        else{
            return res.status(401).json({ error: "passwords do not match" });
        }
      }else{
        return res.status(401).json({ error: "Invalid old password" });
      }
    } catch (error) {
        console.log();
    }
}

const editEmail = async (req,res)=>{
    try {
        const email = req.body.email
        
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
    about,
    contact,
    productDetails,
    pagination,
    userProfile,
    editProfile,
    profileUser,
    loadPassword,
    changePassword

}