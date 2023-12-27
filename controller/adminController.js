const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const products = require('../model/productModel')
const dotenv = require('dotenv')
const { name } = require('ejs')
const path = require('path')
const sharp = require('sharp')
const { fstat } = require('fs')
const session = require('express-session')



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
        res.render('add-categ')
    } catch (error) {
        console.log(error);
    }
}

//add category to categories
const addCategoryItems = async (req, res) => {
    try {

        const categoryExist = await categories.findOne({ name: req.body.categoryName });

        if (categoryExist) {
            res.render('add-categ', { message: "category already exist" })
        } else {

            const { categoryName, description } = req.body

            const newCategory = new categories({
                name: categoryName,
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
        const id = req.query.categoryid
        const data = await categories.findOne({ _id: id })
        res.render('edit-categ', { categories: data })
    } catch (error) {
        console.log(error);
    }
}

// edit-category
const editCategory = async (req, res) => {
    try {
        // console.log('edit:',req.body.id);
        await categories.findByIdAndUpdate({ _id: req.body.id }, { name: req.body.categoryName, description: req.body.description })
        console.log(':', req.body.categoryName);
        res.redirect('/admin/categories')


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
        res.render('add-products', { categories: data })
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
            res.render('add-products', { message: "product already exist", categories: categdata })

        } else {
            const { productName, description, price, category, quantity, date } = req.body

            const filenames = []

            const data = await categories.find({ isListed: true })

            res.render('add-products', { categories: data })

            if (req.files.length !== 4) {
                return res.render('add-products', { message: '4 images needed', categories: data })
            }

            // resize and save each uploaded image
            for (let i = 0; i < req.files.length; i++) {
                const imagesPath = path.join(__dirname, '../public/sharpImages', req.files[i].filename)
                await sharp(req.files[i].path).resize(800, 1200, { fit: 'fill' }).toFile(imagesPath)
                filenames.push(req.files[i].filename)
            }
            const newProduct = new products({
                name: productName,
                description,
                price,
                category,
                images: filenames,
                quantity,
                date

            })

            await newProduct.save()
            res.redirect('/admin/products')


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
                return res.render('edit-products', { message: 'only four images allowed',products, categories: categdata })
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
        fs.unlink(path.join(__dirname, '../public/sharpImages', img), () => { });
        await products.updateOne(
            { _id: productid },
            { $pull: { images: img } }
        );
        res.send({ success: true })
    } catch (error) {
        res.status(500).send({ success: false, error: error.message })
    }
}

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
    deleteImg
}