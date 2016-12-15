var Botkit = require('botkit');

module.exports = function (config) {
  var funcs = {};

  const FARFAR_USER = config.get('storageKey');

  // keep list of channel ids
  var channels = {};

  var controller = Botkit.slackbot({
    debug: false,
    json_file_store: config.get('storageDirectory')
    //include "log: false" to disable logging
    //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
  });
  
  funcs.bot = controller.spawn({
    token: config.get('token'),
    retry: 50
  }).startRTM(function (err, bot) {
    // First time we may have to initialize data.
    controller.storage.users.get(FARFAR_USER, function (err, data) {
      if (err) { 
        // No such data, let's create it!
        var data = {id: FARFAR_USER, members: [], blacklist: []};
        controller.storage.users.save(data, function (err) {
          if (err) {
            console.log("Failed to initialize farfar data!");
          }
        });
      }
    });

    // Fetch all channel IDs.
    bot.api.channels.list({}, function (err, response) {
      if (response.hasOwnProperty('channels') && response.ok) {
        response.channels.forEach(channel => { channels[channel.name] = channel.id; });
      }
    });
  });

  // Just forward the hears function call.
  funcs.hears = controller.hears;

  // TODO: we should probably cache users here, since in some cases we make repeated calls quickly.
  funcs.lookupUserId = function (userid, cb) {
    funcs.bot.api.users.list({}, function (err, response) {
      if (err) { cb(err); return; }
      if (response.hasOwnProperty('members') && response.ok) {
        var result = response.members.filter(m => m.id == userid);
        if (result.length != 1) { cb('No such user id!'); return; }
        var user = {
          id: result[0].id,
          name: result[0].real_name || result[0].name,
          email: result[0].profile.email,
          username: result[0].name
        };
        cb(null, user);
      }
    });
  };

  funcs.sayToChannel = function (channel, text) {
    // Finds ID of channel, if not found, log error to console.
    if (channels.hasOwnProperty(channel)) {
      funcs.bot.say({
        text: text,
        channel: channels[channel]
      });
    } else {
      console.log('No channel', channel, 'found! Only have:', channels);
    }
  };

  var sayToMember = function (member, text, emailSubject) {
    // We must first open a direct IM channel to the user.
    funcs.bot.api.im.open({user: member.id}, function (err, response) {
      if (err || !response.ok) { console.log('Failed to open IM channel with', member.name); return; }
      funcs.bot.say({
        text: text,
        channel: response.channel.id
      });
    });

    if (emailSubject && member.email) {
      mail.send(member, emailSubject, text);
    }
  };

  funcs.storage = controller.storage;

  return funcs;
};

