const crudRouter    = require('../utils/crudRouter');
const BankAccount   = require('../models/BankAccount');
module.exports      = crudRouter(BankAccount, true);
