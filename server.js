const express = require('express')
const path=require('path')
const app=express()
const session = require('express-session')
require('dotenv').config()
//database
const connectDB=require('./database/connection') 
const flash = require('express-flash')
// port
const PORT = process.env.PORT || 3000
  
// middleware
app.use(express.json())   
app.use(express.urlencoded({extended:true}))    
   
app.use(session({       
    secret:'key',                                       
    saveUninitialized:false,       
    resave:false                               
}))      
     
app.use(flash())
      
// cache 
app.use((req,res,next)=>{    
    res.set('Cache-control','no-store,no-cache')   
    next()
})
    
// view engine 
// app.set('view engine','ejs') 
app.use(express.static(path.resolve(__dirname,'public')))

      
// connection 
connectDB()     
     
app.use('/',require('./routes/userRoutes'))
app.use('/admin',require('./routes/adminRoutes'))
  
  

       
 
app.listen(PORT,()=>{
    console.log(`server is running on port http://localhost:${PORT}`);
})     