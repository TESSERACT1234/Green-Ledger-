const crudRouter = require('../utils/crudRouter');
const Customer   = require('../models/Customer');
module.exports   = crudRouter(Customer);
