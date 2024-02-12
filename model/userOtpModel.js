const mongoose=require('mongoose')

const otpValidation= new mongoose.Schema({
  email:{
    type:String
  },
  otp:{
    type:String
  },
  createdAt:{
    type:Date,
    default:Date.now()
  },
  expiresAt:{       
    type:Date
  }
},{
    timestaps:true
})

otpValidation.index({createdAt:1},{expireAfterSeconds:60})

module.exports=mongoose.model('userotp',otpValidation)