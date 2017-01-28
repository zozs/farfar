var config = require('config');

var controller = require('./controller')(config);
var model = require('./model')(config, controller);
var behaviour = require('./behaviour')(config, controller, model);

