var config = require('config');

var mail = require('./mail')(config);
var slackController = require('./controller')(config);
var model = require('./model')(config, slackController);
var behaviour = require('./behaviour')(config, controller, model);

