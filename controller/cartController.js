const Cart = require('../model/cartModel')
const products = require('../model/productModel')
const User = require('../model/userModel')
const categories = require('../model/categoryModel')


const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id
        // console.log("vanno:", userId);

        // cart details
        if (!userId) {
            res.redirect('/login')

        } else {
            const cartDetails = await Cart.findOne({ user_id: userId }).populate({ path: 'items.product_id' })
            const user = await User.findOne({ _id: userId })

            let amount = 0
            if (cartDetails) {
                cartDetails.items.forEach((cartItem => {
                    let itemPrice = cartItem.price
                    amount += itemPrice * cartItem.quantity
                }))
            }



            res.render('cart', { cart: cartDetails, user, subTotal: amount })
        }
    } catch (error) {
        console.log(error);
    }
}

const addtoCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const { user_id } = req.session;

        if (!user_id) {
            
            res.redirect('/login')
        } else {



            const product = await products.findOne({ _id: productId });


            let cart = await Cart.findOne({ user_id: user_id });


            if (cart) {
                // update exist product
                const existProduct = cart.items.find((x) => x.product_id.toString() === productId)
                if (existProduct) {
                    await Cart.findOneAndUpdate({ user_id: user_id, 'items.product_id': productId },

                        {
                            $inc: {
                                'items.$.quantity': quantity,
                                'items.$.total_price': quantity * existProduct.price
                            }
                        })
                } else {
                    // add new product to cart
                    await Cart.findOneAndUpdate(
                        { user_id: user_id },
                        {
                            $push: {
                                items: {
                                    product_id: productId,
                                    quantity: quantity,
                                    price: product.price,
                                    total_price: product.price * quantity
                                }
                            }
                        })

  
                }
            } else {
                // create new cart and add the products
                const newcart = new Cart({
                    user_id: user_id,
                    items: [{
                        product_id: productId,
                        quantity: quantity,
                        price: product.price,
                        total_price: product.price * quantity
                    }]
                })
                await newcart.save()
            }
            res.json({ success: true })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: 'Error adding item to cart' });
    }
};
const deleteCartProduct = async (req, res) => {
    try {
        const data = req.params.productId
        console.log('id:', data);
        const id = req.session.user_id
        const userCart = await Cart.findOne({ user_id: id })

        const deletedProduct = await Cart.updateOne(
            { _id: userCart },
            { $pull: { items: { product_id: data } } }
        );

        console.log('deleted product', deletedProduct);

        if (deletedProduct.nModified > 0) {
            res.json({ success: true, message: 'Product deleted successfully' });
        } else {
            res.json({ success: false, message: 'Product not found or could not be deleted' });
        }


    } catch (error) {
        console.log(error);
    }
}
const checkout = async (req, res) => {
    try {
        const userId = req.session.user_id

        // cart details
        if (!userId) {
            res.redirect('/login')

        } else {
            const cartDetails = await Cart.findOne({ user_id: userId }).populate({ path: 'items.product_id' })
            const user = await User.findOne({ _id: userId })

            let amount = 0
            if (cartDetails) {
                cartDetails.items.forEach((cartItem => {
                    let itemPrice = cartItem.price
                    amount += itemPrice * cartItem.quantity
                }))
            }
            



            res.render('checkout', { cart: cartDetails, user, subTotal: amount })
        }
    } catch (error) {
        console.log(error);
    }
}


const addAddress = async (req, res) => {
    try {
        const { name, houseName, phoneNumber, place, postCode, state } = req.body
        console.log('body;', name);
        const userId = req.session.user_id
        console.log('id:', userId);
        const data = await User.findByIdAndUpdate(
            { _id: userId },
            {
                $push: {
                    address: [
                        {
                            name,
                            houseName,
                            phoneNo: phoneNumber,
                            place,          
                            postCode,
                            state
                        }
                    ]
                }
            }, { new: true }
        )

        console.log('data', data);




    } catch (error) {
        console.log(error);
    }
}

 
module.exports = {
    loadCart,
    addtoCart,
    deleteCartProduct,
    checkout,
    addAddress
    
}