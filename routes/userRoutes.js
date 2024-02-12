const express =require('express')
const userController=require('../controller/userController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')
const auth = require('../middleware/auth')
const router = express()
//................................................................................................................................//


// view engine
router.set('view engine','ejs')
router.set('views','./views/user')
//................................................................................................................................//

router.get('/',auth.islogOut,userController.homePage);

router.get('/home',userController.homePage);

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

router.get('/shop/filter',userController.shop)

router.get('/contact',userController.contact)

router.get('/about',userController.about)

router.get('/productdetails',userController.productDetails)

router.get('/userprofile',auth.isLogin,userController.profileUser)

router.get('/profile',auth.isLogin,userController.userProfile)

router.post('/profile',userController.editProfile)
 
router.get('/cart',auth.checkBlocked,auth.isLogin,cartController.loadCart)

router.post('/cart',cartController.addtoCart)

router.delete('/deleteProduct/:productId',cartController.deleteCartProduct)

router.get('/checkout',auth.isLogin,cartController.checkout)

router.post('/addAddress',cartController.addAddress)

router.get('/orderpage/:id',auth.isLogin,orderController.orderPage)

router.post('/placeOrder',orderController.placeOrder)

router.get('/orderlist',auth.isLogin,orderController.orderList)

router.get('/address',auth.isLogin,orderController.loadProfileAddress)

router.get('/vieworders',auth.isLogin,orderController.viewOrder)

router.get('/changepassword',auth.isLogin,userController.loadPassword)

router.post('/changepassword',userController.changePassword)

router.post('/changeQuantity',cartController.postChangeQuantity)

router.post('/cancel-order',userController.cancelOrder);

router.get('/resendOtp',userController.resendOtp)

router.post('/editAddress',userController.editAddress);

router.post('/delete-address',userController.deleteAddress)

router.post('/verify-payment',orderController.verifyPayment);

router.post('/applyCoupon',orderController.applyCoupon);

router.get('/wallet',auth.isLogin,userController.loadWallet);

router.get('/invoice',auth.isLogin,orderController.invoiceDownload)

module.exports= router 