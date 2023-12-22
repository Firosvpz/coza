const Cart = require('../model/cartModel')
const products = require('../model/productModel')
const User = require('../model/userModel')
const categories = require('../model/categoryModel')
// const cart = require('../model/cartModel')


const loadCart = async (req,res) => {
    try {
        const userId = req.session.user_id
        console.log("vanno:",userId);

        // cart details
        if(!userId){
            res.redirect('/login')

        }else{
        const cartDetails = await Cart.findOne({user_id:userId}).populate({path:'items.product_id'})
        const user = await User.findOne({_id:userId})


   
        res.render('cart',{cart:cartDetails,user})
    }
    } catch (error) {
        console.log(error);
    }
}

const addtoCart = async (req,res) =>{
    try {
       
        const {productId,quantity} = req.body
        const {user_id} = req.session
        console.log(productId);
        // const product = await products.findOne({_id:productId})
        // const cart = await Cart.findOne({user_id:user_id})

        const newCart = new Cart({
            user_id:user_id,
            items:[     
                {product_id:productId,
                 quantity:quantity,
                 total_price:quantity
                 }
            ]
        })
        

        await newCart.save()
        console.log('new:',newCart);
        res.json({success:true})
        
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    loadCart,
    addtoCart
}