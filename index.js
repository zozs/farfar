var Botkit = require('botkit');
var config = require('config');
var moment = require('moment');
var schedule = require('node-schedule');

var controller = Botkit.slackbot({
  debug: false,
  json_file_store: config.get('storageDirectory')
  //include "log: false" to disable logging
  //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
});

const FARFAR_USER = config.get('storageKey');

// keep list of channel ids
var channels = {};

// connect the bot to a stream of messages
var bot = controller.spawn({
  token: config.get('token')
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

var getData = function (cb) {
  controller.storage.users.get(FARFAR_USER, cb);
};

var manipulateData = function (cb, manipulation) {
  getData(function (err, data) {
    if (err) { cb(err); return; }
    manipulation(data, function (err, newData) {
      if (err) { cb(err); return; }
      controller.storage.users.save(newData, cb);
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
    
    cb(null, { date: nextFikaDate, member: data.members[0] });
  });
};

// Member and blacklist logic.

var blacklist = {
  add: function (date, cb) {
    manipulateData(cb, function (data, cb2) {
      data.blacklist.push(date);
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
  add: function (email, name, cb) {
    manipulateData(cb, function (data, cb2) {
      data.members.push({email: email, name: name});
      cb2(null, data);
    });
  },
  remove: function (email, cb) {
    manipulateData(cb, function (data, cb2) {
      let before = data.members.length;
      data.members = data.members.filter(current => current.email != email);
      let after = data.members.length;
      if (after < before) {
        cb2(null, data);
      } else {
        cb2("No such user found to delete");
      }
    });
  },
  move: function (email, position, cb) {
    manipulateData(cb, function (data, cb2) {
      let newMembers = data.members.filter(current => current.email != email);
      let toMove = data.members.filter(current => current.email == email);
      if (toMove.length == 0) { cb2("No such user."); return; }
      newMembers.splice(position, 0, toMove[0]);
      data.members = newMembers;
      cb2(null, data);
    });
  },
  rotate: function (cb) {

  },
  list: function (cb) {
    controller.storage.users.get(FARFAR_USER, function (err, data) {
      if (err) { cb(err); return; }
      cb(null, data.members);
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
controller.hears('^blacklist add (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  blacklist.add(message.match[1], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have added ' + message.match[1] + ' to the blacklist!');
  }));
});

controller.hears('^blacklist remove (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  blacklist.remove(message.match[1], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have removed ' + message.match[1] + ' from the blacklist!');
  }));
});

// TODO: should probably sort the blacklist in date order.
controller.hears('^blacklist list$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  blacklist.list(errorWrap(bot, message, function (bot, message, data) {
    let msg = 'This is the current blacklist, in arbitrary order:\n';
    data.forEach(date => { msg += date + '\n'; });
    bot.reply(message, msg);
  }));
});

// Member management
// TODO: switch from email to slack username instead?
controller.hears('^add <mailto:\\S+\\|(\\S+)> (.+)$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  members.add(message.match[1], message.match[2], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have added ' + message.match[2] + ' to the fika list!');
  }));
});

controller.hears('^remove <mailto:\\S+\\|(\\S+)>$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  members.remove(message.match[1], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have removed ' + message.match[1] + ' from the fika list!');
  }));
});

controller.hears('^move <mailto:\\S+\\|(\\S+)> (\\d+)$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  members.move(message.match[1], message.match[2], errorWrap(bot, message, function (bot, message) {
    bot.reply(message, 'I have moved ' + message.match[1] + ' to position ' + message.match[2] + ' in the fika order.');
  }));
});

controller.hears('^list$', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  members.list(errorWrap(bot, message, function (bot, message, data) {
    let msg = 'This is the current member list, in next-fika order:\n';
    data.forEach(member => { msg += member.name + ' (' + member.email + ')\n'; });
    bot.reply(message, msg);
  }));
});

// Sometimes we just want to ask when the next fika is.
controller.hears(['next', 'nästa', 'fika'], ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  nextFika(function (err, data) {
    bot.reply(message, 'The next fika takes place on ' + data.date.format('YYYY-MM-DD') + ' and is served by ' + data.member.name);
  });
});

// We want a periodic fika remainder at certain times.
// The "every sunday reminder" for next week's fika.
var weekReminder = schedule.scheduleJob('0 0 12 * * 0', function () {
  // TODO: actually check if this week have a fika.
  nextFika(function (err, data) {
    sayToChannel(config.get('announceChannel'),
      'This is a gentle reminder that fika will be provided by ' + data.member.name +
      ' this coming ' + data.date.format('dddd') + '.\n\nBest Wishes,\nFARFAR');
  });
});

// The "every <fikaday> reminder" for the same day's fika.
var sameDayReminder = schedule.scheduleJob('0 0 10 * * ' + config.get('fikaDay'), function () {
  // First we must check that today is indeed the fika day (this day could have been blacklisted!)
  nextFika(function (err, data) {
    if (data.date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
      sayToChannel(config.get('announceChannel'),
        'This is a gentle reminder that fika will be provided by ' + data.member.name + ' at 15:00 today.\n\nBest Wishes,\nFARFAR');
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
