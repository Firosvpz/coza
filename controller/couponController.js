const Coupon = require('../model/couponModel');

//................................................................................................................................//

const loadCouponList = async (req, res) => {
    try {
        const coupons = await Coupon.find({});
        res.render('coupons', { coupons })
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const loadAddCoupons = async (req, res) => {
    try {
        res.render('add-coupons')
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const addCoupon = async (req, res) => {
    try {
        const { name, couponCode, couponDescription, couponAvailability, discountAmount, minAmount, expiryDate } = req.body
        const existCoupon = await Coupon.findOne({
            couponCode: { $regex: new RegExp(couponCode), $options: 'i' }
        });
        if (existCoupon) {

            res.render('add-coupons', {
                message: 'Coupon code already exists',
                name, couponCode, couponDescription, couponAvailability, discountAmount, minAmount, expiryDate
            },)
        } else {
            const coupon = new Coupon({
                couponName: name,
                couponCode: couponCode,
                discountAmount: discountAmount,
                minAmount: minAmount,
                couponDescription: couponDescription,
                Availability: couponAvailability,
                expiryDate: expiryDate,
                status: true
            })
            await coupon.save()
            res.redirect('/admin/coupons')
        }
    } catch (error) {
        console.log(error.message);
    }
}
//................................................................................................................................//

const loadEditCoupon = async (req, res) => {
    try {
        const id = req.query.couponid
        console.log('id:',id);
        const data = await Coupon.findById({ _id: id })
        console.log('dd:',data);
        res.render('edit-coupon', { coupons: data })

    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const EditCoupon = async (req, res) => {
    try {
        const couponCodeRegex = new RegExp(`^${req.body.couponCode}$`, 'i');

        const existingCoupon = await Coupon.findOne({ couponCode: couponCodeRegex });
        // console.log('id:',req.body);
        if (existingCoupon && existingCoupon.couponCode !== req.body.couponCode) {
            req.flash("message", "Coupon code already exists")
            res.render('edit-coupon', { coupons: req.body })
        } else {
            // Update the coupon since the code doesn't exist or it's the same coupon being edited
            
            await Coupon.findByIdAndUpdate(
                { _id: req.body.id },
                {
                    couponName: req.body.couponName,
                    couponCode: req.body.couponCode,
                    discountAmount: req.body.discountAmount,
                    minAmount: req.body.minAmount,
                    couponDescription: req.body.couponDescription,
                    Availability: req.body.Availability,
                    expiryDate: req.body.expiryDate
                });
            res.redirect('/admin/coupons');
        }
    } catch (error) {
        console.log(error);
    }
}

//................................................................................................................................//

const deleteCoupons = async (req, res) => {
    try {
        const couponId = req.params.couponId;
        await Coupon.deleteOne({ _id: couponId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
//................................................................................................................................//

module.exports = {
    loadCouponList,
    loadAddCoupons,
    addCoupon,
    loadEditCoupon,
    deleteCoupons,
    loadEditCoupon,
    EditCoupon
}