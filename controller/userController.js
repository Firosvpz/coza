const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config()

const userOtp = require('../model/userOtpModel')
const products = require('../model/productModel')
const Categories = require('../model/categoryModel')
const { usersList, listCategory } = require('./adminController')
const Order = require('../model/orderModel')




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
const resendOtp = async (req, res) => {
    const email = req.query.email;

    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(400).send({ error: "Email does not exist" });
        }

        // Call your function to send the OTP again
        sendOtpverification(user, res); // Assuming this function sends the OTP
        res.redirect('/loginotp')



    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Something went wrong while resending OTP" });
    }
}
const mailChangeOtp = async (req, res) => {
    try {
        const id = req.session.user_id;
        const user = await User.findOne({ _id: id });
        if (!user) {
            // Handle case where user is not found
            return res.status(404).send('User not found');
        }
        req.session.user = user;
        res.render('mailchange', { user })
    } catch (error) {
        console.log(error);
    }
}
const changeMail = async (req, res) => {
    try {
        const id = req.session.user_id;
        const user = await User.findOne({ _id: id });
        if (!user) {
            // Handle case where user is not found
            return res.status(404).send('User not found');
        }
        req.session.user = user;
        res.render('changemail', { user });
    } catch (error) {
        console.log(error);

    }
}

const sendOtpForEmailChange = async (req, res) => {
    try {
        const { currentEmail, newEmail } = req.body
        // Generate OTP
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
        // Send OTP to the new email
        await sendOtpverification({ email: newEmail, otp });
        const saltrounds = 10
        // Hash and store OTP in the database
        const hashedOtp = await bcrypt.hash(otp, saltrounds);
        const newOtpVerification = await new userOtp({
            email: newEmail,
            otp: hashedOtp,
            createdAt: new Date(),
        });
        // Save OTP record
        await newOtpVerification.save();

        // Redirect to OTP verification page for the new email
        res.redirect(`/verifyEmailChange?currentEmail=${currentEmail}&newEmail=${newEmail}&userId=${req.session.user_id}`);
    } catch (error) {
        console.log(error.message);
    }
};

const verifyEmailChange = async (req, res) => {
    try {
        const { currentEmail, newEmail, userId } = req.query;
        const user = await User.findOne({ _id: userId })
        console.log('ab:', currentEmail, newEmail);
        res.render('mailchange', { currentEmail, newEmail, user });
    } catch (error) {
        console.log(error.message);
    }
};

const verifyEmailChangeOTP = async (req, res) => {
    try {
        const { currentEmail, newEmail } = req.body;
        const otp = `${req.body.one}${req.body.two}${req.body.three}${req.body.four}`;

        const user = await userOtp.findOne({ email: newEmail });
        if (!user) {
            res.render('changemail', { message: 'OTP expired or invalid' });
        }

        const { otp: hashedOtp } = user;
        const validOtp = await bcrypt.compare(otp, hashedOtp);

        if (validOtp) {
            // Update email address in the database for the user
            await User.findOneAndUpdate({ email: currentEmail }, { email: newEmail });

            // Delete OTP record
            await userOtp.deleteOne({ email: newEmail });

            res.redirect('/home'); // Redirect to home or any desired page
        } else {
            res.render('mailchange', { message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.log(error.message);
    }
};



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






const PRODUCTS_PER_PAGE = 8;

const shop = async (req, res) => {
    try {
        let user
        let data;

        if (req.session.user_id) {
            const id = req.session.user_id;
            user = await User.findOne({ _id: id });
        }


        const categoryId = req.query.categoryId;

        if (categoryId) {
            data = await products.find({ isListed: true, category: categoryId });
        } else {
            data = await products.find({ isListed: true });
        }

        const categoryData = await Categories.find({ isListed: true });
        const ListedCategory = categoryData.map(categ => categ.categoryName);




        const page = req.query.page || 1;
        const searchTerm = req.query.search;
        const priceFrom = req.query.priceFrom;
        const priceTo = req.query.priceTo;
        const priceSort = req.query.priceSort;


        let listedProducts = data.filter((product) => {
            const isListedProducts = product.isListed === true;
            const productcategory = ListedCategory.includes(product.category)
            return isListedProducts && productcategory
        });

        // Extend the query conditions based on the search term
        if (searchTerm) {
            listedProducts = listedProducts.filter((product) =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Further filter products based on price range
        if (priceFrom && priceTo) {
            listedProducts = listedProducts.filter((product) => {
                const productPrice = parseFloat(product.price);
                return (
                    productPrice >= parseFloat(priceFrom) &&
                    productPrice <= parseFloat(priceTo)
                );
            });
        }

        // Extend the query conditions based on the sorting option
        if (priceSort) {
            if (priceSort === 'asc') {
                listedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            } else if (priceSort === 'desc') {
                listedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            }
        }

        // Calculate the total number of pages
        const totalPages = Math.ceil(listedProducts.length / PRODUCTS_PER_PAGE);

        // Perform pagination on the listed products
        const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
        const endIndex = page * PRODUCTS_PER_PAGE;
        const paginatedProducts = listedProducts.slice(startIndex, endIndex);


        if (req.xhr) {
            res.json({ success: true, data: paginatedProducts })

        } else {
            // If it's a regular request, render the 'shop' view
            res.render('shop', {
                products: paginatedProducts,
                user,
                req,
                // currentRoute: '/shop',
                totalPages,
                categories: categoryData

                // currentPage: page,
            });

        }







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
        const userData = req.session.user_id
        const id = req.query.id
        const data = await products.findOne({ _id: id })

        res.render('productdetails', { products: data, user: userData })
    } catch (error) {
        console.log(error);
    }
}


const userProfile = async (req, res) => {
    try {
        const id = req.session.user_id;

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
        if (!id) {
            res.redirect('/login')
        }

        const user = await User.findOne({ _id: id });
        res.render('userprofile', { user })
    } catch (error) {
        console.log(error);
    }
}
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
  
      console.log(updatedUser, "here is your updated user");
      res.json({ edited: true });
    } catch (err) {
      console.log(err.message);
    }
  };
  
  const deleteAddress = async (req, res) => {
    try {
      console.log("hihi");
      const userId = req.session.user_id;
      const { Addid } = req.body;
      console.log(Addid, "here we aere");
      await User.updateOne(
        { _id: userId },
        { $pull: { address: { _id: Addid } } }
      );
      res.json({ deleted: true });
    } catch (err) {
      console.log(err.message);
    }
  };
const loadPassword = async (req, res) => {
    try {
        const user = req.session.user_id;
        res.render('password', { user: user })
    } catch (error) {
        console.log(error);
    }
}


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        console.log(req.body);
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
const cancelOrder = async (req, res) => {
    console.log('sghjdshdj:', req.body);
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
    changeMail,
    sendOtpForEmailChange,
    verifyEmailChange,
    verifyEmailChangeOTP,
    mailChangeOtp,
    editAddress,
    deleteAddress

}