var Botkit = require('botkit');
var async = require('async');
var config = require('config');
var moment = require('moment');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');

var controller = Botkit.slackbot({
  debug: false,
  json_file_store: config.get('storageDirectory')
  //include "log: false" to disable logging
  //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
});

const FARFAR_USER = config.get('storageKey');

// Prepare e-mail transport.
var transporter = nodemailer.createTransport(config.get('nodemailerTransport'));

// keep list of channel ids
var channels = {};

// connect the bot to a stream of messages
var bot = controller.spawn({
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

// TODO: we should probably cache users here, since in some cases we make repeated calls quickly.
var lookupUserId = function (userid, cb) {
  bot.api.users.list({}, function (err, response) {
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

var sayToChannel = function (channel, text) {
  // Finds ID of channel, if not found, log error to console.
  if (channels.hasOwnProperty(channel)) {
    bot.say({
      text: text,
      channel: channels[channel]
    });
  } else {
    console.log('No channel', channel, 'found! Only have:', channels);
  }
};

var sayToMember = function (member, text, emailSubject) {
  // We must first open a direct IM channel to the user.
  bot.api.im.open({user: member.id}, function (err, response) {
    if (err || !response.ok) { console.log('Failed to open IM channel with', member.name); return; }
    bot.say({
      text: text,
      channel: response.channel.id
    });
  });
  
  if (emailSubject && member.email) {
    var mailOptions = {
      from: '"FARFAR" <linus.karlsson@eit.lth.se>',
      to: '"' + member.name + '" <' + member.email + '>',
      subject: emailSubject,
      text: text
    };
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log('Failed to send e-mail:', err);
      }
    });
  }
};

var getData = function (cb) {
  controller.storage.users.get(FARFAR_USER, cb);
};

var manipulateData = function (cb, manipulation) {
  getData(function (err, data) {
    if (err) { cb(err); return; }
    manipulation(data, function (err, newData, returnData) {
      if (err) { cb(err); return; }
      controller.storage.users.save(newData, function (err) {
        cb(err, returnData);
      });
    });
  });
};

// Fika logic.
var nextFika = function (cb) {
  // Returns next fika as {date: {momentdateobj}, member: {...} } to the callback.
  getData(function (err, data) {
    if (err) { cb(err); return; }
    if (data.members.length == 0) { cb("no users"); return; }
    // Find date of next Thursday (or other fikaDay) not blacklisted.
    var fikaDay = config.get('fikaDay');
    do {
      var nextFikaDate = moment().day(fikaDay);
      fikaDay += 7;
    } while (data.blacklist.indexOf(nextFikaDate.format('YYYY-MM-DD')) >= 0);
    
    lookupUserId(data.members[0], function (err, user) {
      if (err) { cb('no such user to serve fika!'); return; }
      cb(null, { date: nextFikaDate, member: user });
    });
  });
};

// Member and blacklist logic.

var blacklist = {
  add: function (date, cb) {
    manipulateData(cb, function (data, cb2) {
      data.blacklist.push(date);
      data.blacklist.sort();
      cb2(null, data);
    });
  },
  remove: function (date, cb) {
    manipulateData(cb, function (data, cb2) {
      let index = data.blacklist.indexOf(date);
      if (index > -1) {
        data.blacklist.splice(index, 1);
        cb2(null, data);
      } else {
        cb2("No such date found in blacklist");
      }
    });
  },
  list: function (cb) {
    controller.storage.users.get(FARFAR_USER, function (err, data) {
      if (err) { cb(err); return; }
      cb(null, data.blacklist);
    });
  }
};

var members = {
  add: function (userid, cb) {
    manipulateData(cb, function (data, cb2) {
      // Do a lookup to see if the user exists.
      lookupUserId(userid, function (err, user) {
        if (err) { cb2(err); return; }
        data.members.push(userid);
        cb2(null, data, user);
      });
    });
  },
  remove: function (userid, cb) {
    manipulateData(cb, function (data, cb2) {
      let before = data.members.length;
      data.members = data.members.filter(current => current != userid);
      let after = data.members.length;
      if (after < before) {
        lookupUserId(userid, function (err, user) {
          if (!err) {
            cb2(null, data, user);
          } else {
            cb2(null, data, { id: userid, name: userid, username: userid, email: '' });
          }
        });
      } else {
        cb2("No such user found to delete");
      }
    });
  },
  move: function (userid, position, cb) {
    manipulateData(cb, function (data, cb2) {
      let newMembers = data.members.filter(current => current != userid);
      let toMove = data.members.filter(current => current == userid);
      if (toMove.length == 0) { cb2("No such user."); return; }
      newMembers.splice(position, 0, toMove[0]);
      data.members = newMembers;
      lookupUserId(userid, function (err, user) {
        if (!err) {
          cb2(null, data, user);
        } else {
          cb2(null, data, { id: userid, name: userid, username: userid, email: '' });
        }
      });
    });
  },
  rotate: function (cb) {

  },
  list: function (cb) {
    controller.storage.users.get(FARFAR_USER, function (err, data) {
      if (err) { cb(err); return; }
      async.mapSeries(data.members, lookupUserId, function (err, users) {
        if (err) { cb('The user list contains at least one invalid user id!'); return; }
        cb(null, users);
      });
    });
  }
};

// give the bot something to listen for.
controller.hears('hello',['direct_message','direct_mention','mention'], function (bot, message) {
  bot.reply(message,'Hello yourself.');
});

controller.hears('kebab',['direct_message','direct_mention','mention'], function (bot, message) {
  bot.reply(message,'Sorry, you should speak to Martin about kebab...');
});

controller.hears('jag heter (\\S+)', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  bot.reply(message, 'Hej ' + message.match[1] + ', du är söt! Puss på dig! :kissing_heart:');
});

var errorWrap = function (bot, message, cb) {
  return function (err, data) {
    if (err) {
      bot.reply(message, 'Oopps. Something went wrong. Sorry :(');
      console.log(err);
    } else {
      cb(bot, message, data);
    }
  };
};

// Blacklist management
// TODO: instead of regex date, check actual date validity?
controller.hears('^blacklist (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention'], function (bot, message) {
  blacklist.add(message.match[1], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have added ' + message.match[1] + ' to the blacklist!');
  }));
});

controller.hears('^whitelist (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention'], function (bot, message) {
  blacklist.remove(message.match[1], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have removed ' + message.match[1] + ' from the blacklist!');
  }));
});

controller.hears('^blacklist$', ['direct_message', 'direct_mention'], function (bot, message) {
  blacklist.list(errorWrap(bot, message, function (bot, message, data) {
    let msg = 'This is the current blacklist:\n';
    data.forEach(date => { msg += date + '\n'; });
    bot.reply(message, msg);
  }));
});

// Member management
controller.hears('^add <@(.*)>$', ['direct_message', 'direct_mention'], function (bot, message) {
  members.add(message.match[1], errorWrap(bot, message, function (bot, message, data) {
    bot.reply(message, 'I have added ' + data.name + ' (<@' + data.id + '>, ' + data.email + ') to the fika list!');
  }));
});

controller.hears('^remove <@(.*)>$', ['direct_message', 'direct_mention'], function (bot, message) {
  members.remove(message.match[1], errorWrap(bot, message, function (bot, message, data) {
    bot.reply(message, 'I have removed ' + data.name + ' (<@' + data.id + '>, ' + data.email + ') from the fika list!');
  }));
});

controller.hears('^move <@(.*)> (\\d+)$', ['direct_message', 'direct_mention'], function (bot, message) {
  members.move(message.match[1], message.match[2], errorWrap(bot, message, function (bot, message, data) {
    bot.reply(message, 'I have moved ' + data.name + ' (<@' + data.id + '>) to position ' + message.match[2] + ' in the fika order.');
  }));
});

controller.hears('^list$', ['direct_message', 'direct_mention'], function (bot, message) {
  members.list(errorWrap(bot, message, function (bot, message, data) {
    let msg = 'This is the current member list, in next-fika order:\n';
    data.forEach(member => { msg += member.name + ' (' + member.username + ')\n'; });
    bot.reply(message, msg);
  }));
});

// Sometimes we just want to ask when the next fika is.
controller.hears(['next', 'nästa', 'fika'], ['direct_message', 'direct_mention'], function (bot, message) {
  nextFika(function (err, data) {
    bot.reply(message, 'The next fika takes place on ' + data.date.format('YYYY-MM-DD') + ' and is served by ' + data.member.name);
  });
});

// We want a periodic fika remainder at certain times.
// The "every sunday reminder" for next week's fika.
var weekReminder = schedule.scheduleJob('0 0 12 * * 0', function () {
  nextFika(function (err, data) {
    if (data.date.subtract(7, 'days') < moment()) { // If fika day is within 7 seven days from today.
      sayToChannel(config.get('announceChannel'),
        'This is a gentle reminder that fika will be provided by ' + data.member.name +
        ' this coming ' + data.date.format('dddd') + '.\n\nBest Wishes,\nFARFAR');
      sayToMember(data.member, 'This is a gentle reminder that *you* are scheduled ' +
        'to provide fika this coming ' + data.date.format('dddd') + '.\n\nBest Wishes,\nFARFAR',
        'You serve fika this coming ' + data.date.format('dddd'));
    }
  });
});

// The "every <fikaday> reminder" for the same day's fika.
var sameDayReminder = schedule.scheduleJob('0 0 10 * * ' + config.get('fikaDay'), function () {
  // First we must check that today is indeed the fika day (this day could have been blacklisted!)
  nextFika(function (err, data) {
    if (data.date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
      sayToChannel(config.get('announceChannel'),
        'This is a gentle reminder that fika will be provided by ' + data.member.name + ' at 15:00 today.\n\nBest Wishes,\nFARFAR');
      sayToMember(data.member, 'This is a gentle reminder that *you* are scheduled ' +
        'to provide fika at 15:00 today.\n\nBest Wishes,\nFARFAR', 'You serve fika today');
    }
  });
});

// The "IT IS FUCKING FIKA RIGHT NOW reminder" when fika starts in 3 minutes.
// TODO: make 15:00 flexible...
var sameDayReminder = schedule.scheduleJob('0 57 14 * * ' + config.get('fikaDay'), function () {
  nextFika(function (err, data) {
    if (data.date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
      sayToChannel(config.get('announceChannel'),
        'This is the final call: Fika begins pretty much now!\n\nBest Wishes,\nFARFAR');
    }
 });
});
