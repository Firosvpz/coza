const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const products = require('../model/productModel')
const Order = require('../model/orderModel')
const dotenv = require('dotenv')
const { name } = require('ejs')
const path = require('path')
const sharp = require('sharp')
const session = require('express-session')
const moment = require('moment')

const fs = require('fs')



dotenv.config()

const adminLogin = async (req, res) => {
    try {
        res.render('adminlogin')
    } catch (error) {
        console.log(error); 
    }
}


const verifyAdminLogin = async (req, res) => {
    try {

        const admin = {
            email: process.env.email_admin,
            password: process.env.admin_password
        }

        const admin_email = admin.email
        const admin_pswd = admin.password

        const { email, password } = req.body

        if (admin_email == email && admin_pswd == password) {
            req.session.admin = email
            res.redirect('/admin/dashboard')
        } else {
            req.flash('message', 'incorrect email or password')
            res.redirect('/admin')
        }



    } catch (error) {
        console.log(error);

    }
}

const loadDashboard = async (req, res) => {
    try {
        res.render('dashboard')
    } catch (error) {
        console.log(error);
    }
}

// users list

const usersList = async (req, res) => {
    try {
        const userData = await User.find({})
        res.render('userslist', { users: userData })
    } catch (error) {
        console.log(error);
    }
}

const blockUser = async (req, res) => {
    try {
        const userId = req.params.id
        const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true })
        const data = req.session.user_id
        console.log('userId', data);
        if (data === userId) {
            req.session.destroy()
            res.redirect('/home')
        }




        if (!updateUser) {
            return res.status(404).send("user not found")
        }

        res.json({ status: 'success', user: updateUser })
        res.status(500).json({ status: 'error', error: 'internal server error' })



    } catch (error) {
        console.log(error);
    }
}

const unBlockUser = async (req, res) => {
    try {
        const userId = req.params.id
        const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true })

        if (!updateUser) {
            return res.status(404).send("user not found")
        }

        res.json({ status: 'success', user: updateUser })
        res.status(500).json({ status: 'error', error: 'internal server error' })


    } catch (error) {
        console.log(error);
    }
}

// category 
const loadCategory = async (req, res) => {
    try {
        const categData = await categories.find({})

        res.render('categories', { categories: categData })

    } catch (error) {
        console.log(error);
    }
}

// list category
const listCategory = async (req, res) => {
    try {
        const categId = req.params.id
        const updatedCategory = await categories.findByIdAndUpdate(categId, { isListed: true }, { new: true })

        if (!updatedCategory) {
            return res.status(404).send("user not found")
        }
        res.json({ status: "success", category: updatedCategory })
    } catch (error) {
        console.log(error);
    }
}

// unlist category 
const unListCategory = async (req, res) => {
    try {
        const categId = req.params.id
        const updatedCategory = await categories.findByIdAndUpdate(categId, { isListed: false }, { new: true })
        await products.updateMany({ category: categId }, { $set: { isListed: false } })


        if (!updatedCategory) {
            return res.status(404).send("category not found")
        }
        res.json({ status: "success", category: updatedCategory })
    } catch (error) {
        console.log(error);
    }
}

// load add category
const addCategory = async (req, res) => {
    try {
        res.render('add-categ', { data: req.body })
    } catch (error) {
        console.log(error);
    }
}

//add category to categories
const addCategoryItems = async (req, res) => {
    try {

        // console.log(req.body);

        const categoryNameRegex = new RegExp(`^${req.body.categoryName}$`, 'i');

        const existingCategory = await categories.findOne({ categoryName: { $regex: categoryNameRegex } });


        if (existingCategory && existingCategory._id.toString() !== req.body.id) {

            // If a similar name exists for a different category, prevent the update
            res.render('add-categ', { message: 'category already exist' ,data:req.body});
        } else {

            const { categoryName, description } = req.body

            const newCategory = new categories({
                 categoryName,
                description

            })

            await newCategory.save()
            res.redirect('/admin/categories')
        }
    } catch (error) {
        console.log(error);
    }

}
// load edit-category
const loadEditCategory = async (req, res) => {
    try {

        const id = req.query.categoryid;
        const data = await categories.findOne({ _id: id });
        res.render('edit-categ', { categories: data });


    } catch (error) {
        console.log(error);  
    }
}  


// edit-category
const editCategory = async (req, res) => {
    try {
        // Convert the input category name to a case-insensitive regex pattern
        const categoryNameRegex = new RegExp(`^${req.body.categoryName}$`, 'i');

        // Check for an existing category with a similar name (case-insensitive)
        const existingCategory = await categories.findOne({ categoryName: { $regex: categoryNameRegex } });

        if (existingCategory && existingCategory._id.toString() !== req.body.id) {

            // If a similar name exists for a different category, prevent the update
           req.flash("message","category already exist")
           res.render('edit-categ',{categories:req.body})

        } else {
            // Update the category since the name doesn't exist or it's the same category being edited
            await categories.findByIdAndUpdate({ _id: req.body.id }, { name: req.body.categoryName, description: req.body.description });
            res.redirect('/admin/categories');
        }
    } catch (error) {
        console.log(error);
    }
}


const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;

        await categories.deleteOne({ _id: categoryId });

        res.json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

// loadProducts

const loadProducts = async (req, res) => {
    try {
        const productData = await products.find({})
        res.render('productslist', { products: productData })
    } catch (error) {
        console.log(error);
    }
}

// load add products
const loadAddProducts = async (req, res) => {
    try {
        const data = await categories.find({ isListed: true })
        res.render('add-products', { categories: data,data })
    } catch (error) {
        console.log(error);
    }
}

// add products
const addProducts = async (req, res) => {
    try {
        console.log(req.body);
        const existProduct = await products.findOne({ name: req.body.productName })
        if (existProduct) {
            const categdata = await categories.find({ isListed: true })
            return res.render('add-products', { message: "product already exist", categories: categdata, data: req.body })

        } else {
            const { productName, description, price, category, quantity, date } = req.body

            const filenames = []

            const data = await categories.find({ isListed: true })  

             
            if (req.files.length !== 4) {
                return res.render('add-products', { message: '4 images needed', categories: data })
            }

            // resize and save each uploaded image
            for (let i = 0; i < req.files.length; i++) {
                const imagesPath = path.join(__dirname, '../public/sharpImages', req.files[i].filename)
                await sharp(req.files[i].path).resize(800, 1200, { fit: 'fill' }).toFile(imagesPath)
                filenames.push(req.files[i].filename)
            }
            let discount = parseInt(price)+ Math.floor(parseInt(price) + Math.random() * 1000);
            const newProduct = new products({
                name: productName,
                description,
                price,  
                discount,
                category,
                images: filenames,  
                quantity,  
                date
   
            })

            await newProduct.save()
            return res.redirect('/admin/products')


        }
    } catch (error) {
        console.log(error);
    }
}

// list products 
const listProducts = async (req, res) => {
    try {
        const productId = req.params.id
        const updatedProduct = await products.findByIdAndUpdate(productId, { isListed: true }, { new: true })
        if (!updatedProduct) {
            return res.status(404).send("product not found")
        }
        res.json({ status: "success", products: updatedProduct })

    } catch (error) {
        console.log(error);
    }
}

// unlist products
const unListProducts = async (req, res) => {
    try {
        const productId = req.params.id
        const updatedProduct = await products.findByIdAndUpdate(productId, { isListed: false }, { new: true })
        if (!updatedProduct) {
            return res.status(404).send("product not found")
        }
        res.json({ status: "success", products: updatedProduct })

    } catch (error) {
        console.log(error);
    }
}

// load edit products
const loadEditProducts = async (req, res) => {

    try {
        const id = req.query.productid
        // console.log('query:',id);
        const data = await products.findOne({ _id: id })
        // console.log('data',data);
        const categdata = await categories.find({ isListed: true })
        // console.log('categdata',categdata);
        res.render('edit-products', { products: data, categories: categdata })
    } catch (error) {
        console.log(error);
    }
}

// edit product 
const editProduct = async (req, res) => {
    try {
        const id = req.body.id
        // console.log('id:',id);
        const { productName, description, price, category, quantity } = req.body
        //  console.log('body:',productName);
        const data = await products.findById(id)
        // console.log('ndo:',data);
        const categdata = await categories.find({ isListed: true })

        // check if a new image upload
        let imageData = [];
        if (req.files) {
            const existingImage = (await products.findById(id)).images.length;

            if (existingImage + req.files.length !== 4) {
                return res.render('edit-products', { message: 'only four images allowed', products, categories: categdata })
            }
            for (let i = 0; i < req.files.length; i++) {
                // Resize path
                const resizePath = path.join(__dirname, '../public/sharpImages', req.files[i].filename);

                await sharp(req.files[i].path).resize(800, 1200, { fit: 'fill' }).toFile(resizePath)

                // push images in to array
                imageData.push(req.files[i].filename)
            }
        }

        // update the product in to databse
        const updatedProduct = await products.findByIdAndUpdate(
            id,
            {
                name: productName,
                price,
                description,
                category,
                quantity,
                $push: { images: { $each: imageData } }
            }
        );

        if (!updatedProduct) {
            console.error('Product not updated');
            return res.status(500).send('Product update failed');
        }

        console.log('Updated product:', updatedProduct);
        res.redirect('/admin/products');


    } catch (error) {
        console.log(error);
    }
}
// deleteimg
const deleteImg = async (req, res) => {
    try {
        console.log(req.body);
        const { img, productid } = req.body
        console.log(img);
       fs.unlink(path.join(__dirname, '../public/sharpimages', img), () => { });
       

        await products.updateOne(
            { _id: productid },
            { $pull: { images: img } }
        );
        res.send({ success: true })
    } catch (error) {
        res.status(500).send({ success: false, error: error.message })
    }
}

// orders
const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  // Get the page number from the query parameter, default to 1 if not provided
        const pageSize = 5;  // Set the number of orders to display per page

        // Default sort order based on the ordered date in descending order
        const defaultSortOrder = -1;

        // Determine the sort order based on the query parameter or use the default
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : defaultSortOrder;

        const totalOrders = await Order.countDocuments();  // Get the total number of orders

        const orders = await Order.find()
            .populate('items.product_id')
            .sort({ date: sortOrder, _id: defaultSortOrder })  // Sort by date in the specified order, then by _id in the default order
            .skip((page - 1) * pageSize)  // Skip records based on pagination
            .limit(pageSize);  // Limit the number of records per page

        res.render('adminOrder', { orders, moment, totalOrders, currentPage: page, pageSize, sortOrder });
    } catch (error) {
        console.log(error);
    }
};

const viewOrderPage = async (req, res) => {
    try {   
        const itemId = req.query.itemId;
        const orderId = req.query.orderId;
        console.log('itemId:',itemId);
        console.log('orderId',orderId);

        const mainOrder = await Order.findOne({ _id: orderId }).populate('user_id').populate({
            path: "items.product_id",
        });

        if (!mainOrder) {
            // Handle case where no order is found with the provided orderId
            return res.status(404).send('Order not found');
        }

        const orderItem = mainOrder.items.find(item => item._id.toString() === itemId);

        res.render('orderDetails', { order: mainOrder, item: orderItem, moment });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, itemId, newStatus } = req.body;
    console.log('hjh:',req.body);
  
    let update = { 'items.$.ordered_status': newStatus };
  
    try {
      const order = await Order.findById(orderId);
      console.log('order:',order);
      const item = order.items.find((item) => item._id.toString() === itemId);
  
      console.log('item:',item);

      
      if (item) {
          console.log('orderpayment:',order.payment);
        // If payment is RazorPay and status is 'cancelled' or 'returned'
        if ((order.payment == 'razorPay') && (newStatus === 'cancelled' || newStatus === 'returned') || newStatus === 'returned' ) {
          // Update user's wallet and wallet history
          console.log('okayyy');

          const user = await User.findById(order.user_id);
          const currentDate = new Date();
          const walletHistoryEntry = {
            date: currentDate,
            amount: item.total_price,
            description: `Refund for order`,
          };
  
          // Update wallet history and wallet amount
          user.wallet_history.push(walletHistoryEntry);
          user.wallet += item.total_price;
          console.log('user:',user );
          await user.save();
         
  
          const product = await products.findById(item.product_id);
        
          if (product) {
            // Increase the product quantity by the ordered quantity
            const newStockQuantity = product.quantity + item.quantity;
            await products.findByIdAndUpdate(item.product_id, { quantity: newStockQuantity });
          }
  
        }
  
        // If status is 'cancelled' or 'returned', update product stock quantity
        if (newStatus === 'cancelled') {
          const product = await products.findById(item.product_id);
          console.log('mot okay');
          if (product) {
            // Increase the product quantity by the ordered quantity
            const newStockQuantity = product.quantity + item.quantity;
            await products.findByIdAndUpdate(item.product_id, { quantity: newStockQuantity });
          }
        }
      }
  
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, 'items._id': itemId },
        { $set: update },
        { new: true }
      );
  
      res.json({ success: true, updatedOrder });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  };


  
  




//logout 

const adminLogout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/admin')
    } catch (error) {
        console.log(error);
    }
}
module.exports = {
    adminLogin,
    verifyAdminLogin,
    loadDashboard,
    usersList,
    adminLogout,
    blockUser,
    unBlockUser,
    loadCategory,
    listCategory,
    unListCategory,
    addCategory,
    addCategoryItems,
    loadEditCategory,
    editCategory,
    deleteCategory,
    loadProducts,
    loadAddProducts,
    addProducts,
    listProducts,
    unListProducts,
    loadEditProducts,
    editProduct,
    deleteImg,
    loadOrders,
    viewOrderPage,
    updateOrderStatus,
  
}