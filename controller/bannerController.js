const bannerModel = require('../model/bannerModel')
const path = require('path')
const sharp = require('sharp')
//................................................................................................................................//

const loadBanner = async (req, res, next) => {
    try {
        const banner = await bannerModel.find()

        res.render('banner', { banner })
    } catch (err) {
        next(err)
    }
}
//................................................................................................................................//

const addBanner = async (req, res, next) => {
    try {
        let { message } = req.session
        req.session.message = ''
        res.render('add-banner', { message })
    } catch (err) {
        next(err)
    }
}
//................................................................................................................................//

const postBanner = async (req, res, next) => {
    try {
        const { title, bannerDescription, bannerOccassion } = req.body
        const bannerExist = await bannerModel.findOne({ title: title })

        if (bannerExist) {
            req.session.message = 'banner already exist'
            res.redirect('/admin/banner')
        } else {
            const imageArr = []

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const filePath = path.join(
                        __dirname,
                        "../public/sharpImages",
                        req.files[i].filename
                    );
                    await sharp(req.files[i].path)
                        .resize({ width: 1920, height: 900 })
                        .toFile(filePath);
                    imageArr.push(req.files[i].filename);
                }
            }

            const banner = new bannerModel({
                title: title,
                description: bannerDescription,
                occassion: bannerOccassion,
                image: imageArr,
                status: true
            })
            await banner.save()
            req.session.message = "saved"
            res.redirect('/admin/add-banner')
        }
    } catch (err) {
        next(err)
    }
}
//................................................................................................................................//

const loadEditBanner = async (req, res, next) => {
    try {
        const { id } = req.query
        const banner = await bannerModel.findById({ _id: id })
        res.render('edit-banner', { banner })
    } catch (err) {
        next(err)
    }
}
//................................................................................................................................//

const editBanner = async (req, res, next) => {
    try {
        const {
            banner_id, banner_title, banner_description, banner_occassion
        } = req.body;
        const imageArr = []

        if (req.files && req.files.length > 0) {

            for (let i = 0; i < req.files.length; i++) {

                const filePath = path.join(__dirname, "../public/sharpImages", req.files[i].filename)

                await sharp(req.files[i].path)
                    .resize({ width: 1920, height: 900 })
                    .toFile(filePath);
                imageArr.push(req.files[i].filename);
            }
        }
        if (req.files.length) {
            await bannerModel.findByIdAndUpdate(
                { _id: banner_id },
                {
                    $set: {
                        title: banner_title,
                        description: banner_description,
                        occassion: banner_occassion,
                        image: imageArr
                    }
                })

            res.redirect("/admin/banner");
        } else {
            await bannerModel.findByIdAndUpdate(
                { _id: banner_id },
                {
                    $set: {
                        title: banner_title,
                        description: banner_description,
                        occassion: banner_occassion,
                    }
                }
            )
            res.redirect("/admin/banner");
        }
    } catch (err) {
        next(err)
    }
}
//................................................................................................................................//

module.exports = {
    loadBanner,
    addBanner,
    postBanner,
    loadEditBanner,
    editBanner
}