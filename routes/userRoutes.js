const express =require('express')
const userController=require('../controller/userController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')
const auth = require('../middleware/auth')
const router = express()


// view engine
router.set('view engine','ejs')
router.set('views','./views/user')


 
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

router.get('/contact',userController.contact)

router.get('/about',userController.about)

router.get('/productdetails',userController.productDetails)

router.get('/pagination',userController.pagination)

router.get('/userprofile',userController.profileUser)

router.get('/profile',auth.isLogin,userController.userProfile)

router.post('/profile',userController.editProfile)
 
router.get('/cart',auth.isLogin,cartController.loadCart)

router.post('/cart',cartController.addtoCart)

router.delete('/deleteProduct/:productId',cartController.deleteCartProduct)

router.get('/checkout',cartController.checkout)

router.post('/addAddress',cartController.addAddress)

router.get('/orderpage/:id',orderController.orderPage)

router.post('/placeOrder',orderController.placeOrder)

router.get('/orderlist',orderController.orderList)

router.get('/address',orderController.loadProfileAddress)

router.post('/deleteAddress/',orderController.deleteAddress)

router.get('/vieworders',orderController.viewOrder)

router.get('/changepassword',userController.loadPassword)

router.post('/changepassword',userController.changePassword)




    

module.exports= router 