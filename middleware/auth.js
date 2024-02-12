const User = require('../model/userModel')

const isLogin = async (req, res, next) => {
    try {
        // check if the user is logged in
        if (req.session.user_id) {

            if (req.path == '/login') {
                res.redirect('/home')
                return
            }
            // continue to next middleware if the user is logged in 
            next()
        } else {
            // if the user is not logged in,redirect to homepage
            res.redirect('/login')
        }
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const islogOut = async (req, res, next) => {
    try {


        // check if the user is logged in
        if (req.session.user_id) {
            // if the user is logged in ,redirect to home
            res.redirect('/home')
            return
        }
        next()
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const checkBlocked = async (req, res, next) => {
    const userId = req.session.user_id;

    if (userId) {
        try {
            const user = await User.findOne({ _id: userId });

            if (user && user.isBlocked == true) {
               
                return res.redirect('/login');
            }
        } catch (error) {
            console.error(error.message);
            
        }
    }
    next();
};
//................................................................................................................................//

module.exports = {
    isLogin,
    islogOut,
    checkBlocked
}