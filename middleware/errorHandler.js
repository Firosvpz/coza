const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.render("../views/admin/500page");
  };
  
  module.exports = { errorHandler };