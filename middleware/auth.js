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
            res.redirect('/')
        }
    } catch (error) {
        console.log(error.message);
    }
}

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

module.exports = {
    isLogin,
    islogOut
}