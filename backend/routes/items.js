const crudRouter = require('../utils/crudRouter');
const Item       = require('../models/Item');
module.exports   = crudRouter(Item);
