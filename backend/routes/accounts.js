const crudRouter = require('../utils/crudRouter');
const Account    = require('../models/Account');
module.exports   = crudRouter(Account, true);
