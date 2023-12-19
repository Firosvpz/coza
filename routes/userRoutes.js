const express =require('express')
const userController=require('../controller/userController')
const auth = require('../middleware/auth')
const router = express()


// view engine
router.set('view engine','ejs')
router.set('views','./views/user')


 
router.get('/',auth.islogOut,userController.homePage);

router.get('/home',auth.isLogin,userController.homePage);

router.get('/login',auth.islogOut,userController.loginUser);

router.post('/login',userController.verifyLogin);

router.get('/register',auth.islogOut,userController.registerUser);

router.post('/register',userController.verifyRegister); 

router.get('/loginOtp',auth.islogOut,userController.loadOtp)

router.post('/loginOtp',userController.verifyOtp)

router.get('/email',auth.islogOut,userController.loginOtp)

router.post('/email',userController.verifyLoginOtp)

router.get('/logout',auth.isLogin,userController.logOut)

router.get('/shop',userController.shop)
//
router.get('/cart',userController.cart)

router.get('/contact',userController.contact)

router.get('/about',userController.about)

router.get('/productdetails',userController.productDetails)






module.exports= router 