const isAdminLogin = async (req,res,next)=>{
    try {
        if(req.session.admin){
            if(req.path === '/adminlogin'){
                res.redirect('/admin/dashboard')
                return
            }
            next()
        }else{
            res.redirect('/admin')
        }
    } catch (error) {
        console.log(error);
    }
}
//................................................................................................................................//

const isAdminLogout = async (req,res,next)=>{
    try {
        if(req.session.email_id){
            res.redirect('/admin')
        }
        next()
    } catch (error) {
        console.log(error);
    }
} 
//................................................................................................................................//

module.exports = {
    isAdminLogin,
    isAdminLogout
}