const crudRouter = require('../utils/crudRouter');
const Vendor     = require('../models/Vendor');
module.exports   = crudRouter(Vendor);
