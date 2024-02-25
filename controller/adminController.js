const User = require('../model/userModel')
const categories = require('../model/categoryModel')
const products = require('../model/productModel')
const Order = require('../model/orderModel')
const Offer = require('../model/offerModel')
const dotenv = require('dotenv')
const { name } = require('ejs')
const path = require('path')
const sharp = require('sharp')
const session = require('express-session')
const moment = require('moment')
const fs = require('fs')
dotenv.config()

//................................................................................................................................//


const adminLogin = async (req, res) => {
    try {
        res.render('adminlogin')
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

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
//................................................................................................................................//

const loadDashboard = async (req, res) => {
    try {
        // Unwind orders based on items
        const unwoundOrders = [
            {
                $unwind: "$items",
            },
            {
                $match: {
                    $and: [
                        { "items.ordered_status": "delivered" },
                        { status: { $ne: "pending" } },
                    ],
                },
            },
        ];
        // Monthly sales report based on items.ordered_status - delivered
        let monthlySales = await Order.aggregate([
            ...unwoundOrders,
            {
                $match: {
                    date: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$date" },  // Change from date to date
                    totalSales: {
                        $sum: {
                            $subtract: [
                                { $multiply: ["$items.quantity", "$items.price"] },
                                { $ifNull: ["$items.couponDiscountTotal", 0] }, // Handle null values
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]);
        // Yearly sales report based on items.ordered_status - delivered
        let yearlySales = await Order.aggregate([
            ...unwoundOrders,
            {
            $match: {
                    date: {
                        $gte: new Date(new Date().getFullYear(), 0, 1),
                        $lt: new Date(new Date().getFullYear() + 1, 0, 1),
                    },
                },
            },
            {
             $group: {
                    _id: { $year: "$date" }, 
                    totalSales: {
                        $sum: {
                            $subtract: [
                                { $multiply: ["$items.quantity", "$items.price"] },
                                { $ifNull: ["$items.couponDiscountTotal", 0] }, 
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]);
        const totalSales = await Order.aggregate([
            {
             $unwind: "$items",
            },
            {
             $match: {
                    status: { $ne: "pending" },
                },
            },
            {
            $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $subtract: [
                                { $multiply: ["$items.quantity", "$items.price"] },
                                { $ifNull: ["$items.couponDiscountTotal", 0] },
                            ],
                        },
                    },
                },
            },
        ]);
        // Count total orders, delivered orders, and other orders
        const orderCounts = await Order.aggregate([
            // Unwind without conditions
            {
                $unwind: "$items",
            },
            // Match to exclude orders with status 'pending'
            {
                $match: {
                    status: { $ne: "pending" },
                },
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    deliveredOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$items.ordered_status", "delivered"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    cancelOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$items.ordered_status", "cancelled"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    otherOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $ne: ["$items.ordered_status", "delivered"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);
        // Count different payment methods
        const paymentCounts = await Order.aggregate([
            // Use the unwoundOrders variable in the pipeline
            {
                $unwind: "$items",
            },
            // Match to exclude orders with status 'pending'
            {
                $match: {
                    status: { $ne: "pending" },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    cod: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$payment", "COD"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    razorpay: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$payment", "razorPay"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    wallet: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: ["$payment", "Wallet"],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        const productCount = await products.countDocuments({})
        const categoryCount = await categories.countDocuments({})
        const latestUsers = await User.find({}).sort({ createdAt: -1 }).limit(5)

        const latestOrders = await Order.aggregate([
            {
                $unwind: "$items",
            },
            {
                $match: {
                    status: { $ne: "pending" },
                },
            },
            {
                $sort: {
                    date: -1, 
                },
            },
            {
                $limit: 10, 
            },
        ]);
      
        const currentYear = new Date().getFullYear();
        const yearsToInclude = 7;
        const currentMonth = new Date().getMonth() + 1; 

      // Create arrays with default values for each month and each year
        const defaultMonthlyValues = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            total: 0,
            count: 0,
        }));

        const defaultYearlyValues = Array.from({ length: yearsToInclude }, (_, i) => ({
            year: currentYear - yearsToInclude + i + 1,
            total: 0,
            count: 0,
        }));

        // Monthly sales data
        const monthlySalesData = await Order.aggregate([
            {
                $unwind: '$items',
            },
            {
                $match: {
                    'items.ordered_status': 'delivered',
                    date: { $gte: new Date(currentYear, currentMonth - 1, 1) },
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: { $month: '$date' },
                    total: {
                        $sum: {
                            $subtract: [
                                { $multiply: ['$items.price', '$items.quantity'] },
                                { $ifNull: ['$items.couponDiscountTotal', 0] }, // Handle null values
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    month: '$_id',
                    total: '$total',
                    count: '$count',
                },
            },
        ]);
        // Update monthly values based on retrieved data
        const updatedMonthlyValues = defaultMonthlyValues.map((defaultMonth) => {
            const foundMonth = monthlySalesData.find((monthData) => monthData.month === defaultMonth.month);
            return foundMonth || defaultMonth;
        });
        // Yearly sales data
        const yearlySalesData = await Order.aggregate([
            {
                $unwind: '$items',
            },
            {
                $match: {
                    date: { $gte: new Date(currentYear - yearsToInclude, 0, 1) }, 
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: { $year: '$date' },
                    total: {
                        $sum: {
                            $subtract: [
                                { $ifNull: [{ $multiply: ['$items.price', '$items.quantity'] }, 0] }, 
                                { $ifNull: ['$items.couponDiscountTotal', 0] }, 
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id',
                    total: '$total',
                    count: '$count',
                },
            },
        ]);
        // Update yearly values based on retrieved data
        const updatedYearlyValues = defaultYearlyValues.map((defaultYear) => {
            const foundYear = yearlySalesData.find((yearData) => yearData.year === defaultYear.year);
            return foundYear || defaultYear;
        });
        // Render the dashboard template and pass the data
        res.render('dashboard', {
            monthlySales,
            yearlySales,
            totalSales: totalSales[0],
            orderCounts: orderCounts[0],
            paymentCounts: paymentCounts[0],
            productCount,
            categoryCount,
            latestUsers,
            latestOrders,
            moment,
            updatedMonthlyValues,
            updatedYearlyValues,
        });
    } catch (error) {
        console.log(error.message);
    }
};
//................................................................................................................................//

const salesReport = async (req, res) => {
    try {
        const firstOrder = await Order.find().sort({ date: 1 })
        const lastOrder = await Order.find().sort({ date: -1 })

        const salesReport = await Order.find({ "items.ordered_status": "delivered" })
            .populate("user_id")
            .populate("items.product_id")
            .sort({ date: -1 })
           
            

        res.render('salesReport', {
            firstOrder: moment(firstOrder[0].date).format("YYYY-MM-DD"),
            lastOrder: moment(firstOrder[0].date).format("YYYY-MM-DD"),
            salesReport,
            moment
        })

    } catch (error) {
        console.error(error);
    }
}
//................................................................................................................................//

const datePicker = async (req, res) => {
    try {
        const { startDate, endDate } = req.body
        const startDateObj = new Date(startDate)
        startDateObj.setHours(0, 0, 0, 0)
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)

        const selectedDate = await Order.aggregate([
            {
                $match: {
                    date: {
                        $gte: startDateObj,
                        $lte: endDateObj,
                    },
                    "items.ordered_status": "delivered"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                }
            },
            {
                $unwind: "$items",
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product_id",
                    foreignField: "_id",
                    as: "items.product"
                }
            },
            {
                $unwind: "$items.product",
            },
            {
                $group: {
                    _id: "$_id",
                    user: { $first: "$user" },
                    delivery_address: { $first: "$delivery_address" },
                    order_id: { $first: "$order_id" },
                    date: { $first: "$date" },
                    payment: { $first: "$payment" },
                    items: { $push: "$items" }
                }
            }
        ])

        res.status(200).json({ selectedDate: selectedDate });
    } catch (error) {
        console.log(error);

    }

}
//................................................................................................................................//

const usersList = async (req, res) => {
    try {
       
        const userData = await User.find({})
        res.render('userslist', { users: userData })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
        if (!updateUser) {
            return res.status(404).send("User not found");
        }
        res.json({ status: 'success', user: updateUser });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 'error', error: 'Internal server error' });
    }
};

//................................................................................................................................//

const unBlockUser = async (req, res) => {
    try {
        const userId = req.params.id
        const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true })

        if (!updateUser) {
            return res.status(404).send("User not found")
        }

        res.json({ status: 'success', user: updateUser })
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 'error', error: 'Internal server error' })
    }
}

//................................................................................................................................//

const loadCategory = async (req, res) => {
    try {
        const categData = await categories.find({}).populate('offer')
        const availableOffers = await Offer.find({ expiryDate: { $gte: new Date() } })

        res.render('categories', { categories: categData, offers: availableOffers, moment })

    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

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
//................................................................................................................................//

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
//................................................................................................................................//

const addCategory = async (req, res) => {
    try {
        res.render('add-categ', { data: req.body })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const addCategoryItems = async (req, res) => {
    try {
        const categoryNameRegex = new RegExp(`^${req.body.categoryName}$`, 'i');

        const existingCategory = await categories.findOne({ categoryName: { $regex: categoryNameRegex } });

        if (existingCategory && existingCategory._id.toString() !== req.body.id) {
            res.render('add-categ', { message: 'category already exist', data: req.body });
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
//................................................................................................................................//

const loadEditCategory = async (req, res) => {
    try {

        const id = req.query.categoryid;
        const data = await categories.findOne({ _id: id });
        res.render('edit-categ', { categories: data });


    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const editCategory = async (req, res) => {
    try {
        const categoryNameRegex = new RegExp(`^${req.body.categoryName}$`, 'i');
        const existingCategory = await categories.findOne({ categoryName: { $regex: categoryNameRegex } });

        if (existingCategory && existingCategory._id.toString() !== req.body.id) {e
            req.flash("message", "category already exist")
            res.render('edit-categ', { categories: req.body })

        } else {
            await categories.findByIdAndUpdate({ _id: req.body.id }, { categoryName: req.body.categoryName, description: req.body.description });
            res.redirect('/admin/categories');
         }
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

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
//................................................................................................................................//

const loadProducts = async (req, res) => {
    try {
        const pageSize = 6                                                                                                     ; // Number of products per page
        const currentPage = req.query.page || 1; // Current page, default to 1 if not provided
        const searchQuery = req.query.search || ''; // Search query, default to empty string if not provided

        // Constructing MongoDB query for pagination and search filter
        const query = {};
        if (searchQuery) {
            // If search query is provided, filter products by name using regular expression
            query.name = { $regex: new RegExp(searchQuery, 'i') }; // Case-insensitive search
        }

        // Count total number of products matching the search query
        const totalProductsCount = await products.countDocuments(query);

        // Find products based on the query with pagination
        const productData = await products.find(query)
            .skip((currentPage - 1) * pageSize) // Skip products based on current page
            .limit(pageSize) // Limit the number of products per page
            .populate('offer');

        const availableOffers = await Offer.find({ expiryDate: { $gte: new Date() } });

        res.render('productslist', { 
            products: productData, 
            offers: availableOffers, 
            moment,
            currentPage,
            totalPages: Math.ceil(totalProductsCount / pageSize),
            searchQuery
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

//................................................................................................................................//

const loadAddProducts = async (req, res) => {
    try {
        const data = await categories.find({ isListed: true })
        res.render('add-products', { categories: data, data })
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

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


            if (req.files.length > 4) {
                return res.render('add-products', { message: '4 images needed', categories: data })
            }

            // resize and save each uploaded image
            for (let i = 0; i < req.files.length; i++) {
                const imagesPath = path.join(__dirname, '../public/sharpImages', req.files[i].filename)
                await sharp(req.files[i].path).resize(800, 1200, { fit: 'fill' }).toFile(imagesPath)
                filenames.push(req.files[i].filename)
            }
            let discount = parseInt(price) + Math.floor(parseInt(price) + Math.random() * 1000);
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
//................................................................................................................................//

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
//................................................................................................................................//

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
//................................................................................................................................//

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
//................................................................................................................................//
 
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

            if (existingImage + req.files.length > 4) {
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
//................................................................................................................................//

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

//................................................................................................................................//

const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  
        const pageSize = 5;  

        // Default sort order based on the ordered date in descending order
        const defaultSortOrder = -1;

        // Determine the sort order based on the query parameter or use the default
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : defaultSortOrder;

        const totalOrders = await Order.countDocuments();  // Get the total number of orders

        const orders = await Order.find()
            .populate('items.product_id')
            .sort({ date: sortOrder, _id: defaultSortOrder })  
            .skip((page - 1) * pageSize)  
            .limit(pageSize); 

        res.render('adminOrder', { orders, moment, totalOrders, currentPage: page, pageSize, sortOrder });
    } catch (error) {
        console.log(error);
    }
};
//................................................................................................................................//

const viewOrderPage = async (req, res) => {
    try {
        const itemId = req.query.itemId;
        const orderId = req.query.orderId;
        console.log('itemId:', itemId);
        console.log('orderId', orderId);

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
};//................................................................................................................................//


const updateOrderStatus = async (req, res) => {
    const { orderId, itemId, newStatus } = req.body;

    try {
        const order = await Order.findById(orderId);
        const item = order.items.find((item) => item._id.toString() === itemId);
       
        if (item) {
            let refundedAmount = item.total_price; // Initialize refunded amount with original price

            if ((order.payment === 'razorPay' || order.payment === 'Wallet') && (newStatus === 'cancelled' || newStatus === 'returned')) {
                const user = await User.findById(order.user_id);
                const currentDate = new Date();

                // Retrieve the product with the associated offer
                const product = await products.findById(item.product_id).populate('offer');
                
                // Check if there's an offer applied to the item
                if (product.offer && product.offer.offerPrice) {
                    refundedAmount = product.offer.offerPrice; // Use offer price for refund
                }

                const walletHistoryEntry = {
                    date: currentDate,
                    amount: refundedAmount, // Use the refunded amount
                    description: `Refund for order ${orderId}`, // Adjust description if necessary
                };

                // Ensure that the wallet amount is a valid number
                if (!isNaN(refundedAmount)) {
                    user.wallet_history.push(walletHistoryEntry);
                    user.wallet += refundedAmount; // Update the wallet amount
                }

                await user.save();

                const newStockQuantity = product.quantity + item.quantity;
                await products.findByIdAndUpdate(item.product_id, { quantity: newStockQuantity });
            }

            if (newStatus === 'cancelled') {
                const product = await products.findById(item.product_id);
                if (product) {
                    const newStockQuantity = product.quantity + item.quantity;
                    await products.findByIdAndUpdate(item.product_id, { quantity: newStockQuantity });
                }
            }
        }

        const update = { 'items.$.ordered_status': newStatus };
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


//................................................................................................................................//

const adminLogout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/admin')
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

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
    salesReport,
    datePicker
}