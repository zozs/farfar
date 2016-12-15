var schedule = require('node-schedule');

module.exports = function (config, controller, model) {
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
  controller.hears('^blacklist (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention'], function (bot, message)  {
    model.blacklist.add(message.match[1], errorWrap(bot, message, function (bot, message) {
      bot.reply(message, 'I have added ' + message.match[1] + ' to the blacklist!');
    }));
  });

  controller.hears('^whitelist (\\d{4}-[01]\\d-[0-3]\\d)$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.blacklist.remove(message.match[1], errorWrap(bot, message, function (bot, message) {
      bot.reply(message, 'I have removed ' + message.match[1] + ' from the blacklist!');
    }));
  });

  controller.hears('^blacklist$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.blacklist.list(errorWrap(bot, message, function (bot, message, data) {
      let msg = 'This is the current blacklist:\n';
      data.forEach(date => { msg += date + '\n'; });
      bot.reply(message, msg);
    }));
  });

  // Member management
  controller.hears('^add <@(.*)>$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.members.add(message.match[1], errorWrap(bot, message, function (bot, message, data) {
      bot.reply(message, 'I have added ' + data.name + ' (<@' + data.id + '>, ' + data.email + ') to the fika list!');
    }));
  });

  controller.hears('^remove <@(.*)>$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.members.remove(message.match[1], errorWrap(bot, message, function (bot, message, data) {
      bot.reply(message, 'I have removed ' + data.name + ' (<@' + data.id + '>, ' + data.email + ') from the fika list!');
    }));
  });

  controller.hears('^rotate$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.members.rotate(errorWrap(bot, message, function (bot, message) {
      bot.reply(message, 'I have rotated the fika queue one step.');
    }));
  });

  controller.hears('^move <@(.*)> (\\d+)$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.members.move(message.match[1], message.match[2], errorWrap(bot, message, function (bot, message, data) {
      bot.reply(message, 'I have moved ' + data.name + ' (<@' + data.id + '>) to position ' + message.match[2] + ' in the fika order.');
    }));
  });

  controller.hears('^list$', ['direct_message', 'direct_mention'], function (bot, message) {
    model.members.list(errorWrap(bot, message, function (bot, message, data) {
      let msg = 'This is the current member list, in next-fika order:\n';
      data.forEach(member => { msg += member.name + ' (' + member.username + ')\n'; });
      bot.reply(message, msg);
    }));
  });

  // Sometimes we just want to ask when the next fika is.
  controller.hears(['next', 'nästa', 'fika'], ['direct_message', 'direct_mention'], function (bot, message) {
    model.nextFika(function (err, data) {
      if (!err) {
        bot.reply(message, 'The next fika takes place on ' + data.date.format('YYYY-MM-DD') + ' and is served by ' + data.member.name);
      } else {
        bot.reply(message, 'Something went wrong. Sorry :(')
        console.log('Failed to print next fika:', err);
      }
    });
  });

  // We want a periodic fika remainder at certain times.
  // The "every sunday reminder" for next week's fika.
  var weekReminder = schedule.scheduleJob(config.get('weeklyReminder'), function () {
    console.log('SCHEDULE: Fika later this week job launching.');
    nextFika(function (err, data) {
      if (err) { console.log('Failed to fetch next fika info:', err); }
      if (data.date.subtract(7, 'days') < moment()) { // If fika day is within 7 seven days from today.
        sayToChannel(config.get('announceChannel'),
          'This is a gentle reminder that fika will be provided by ' + data.member.name +
          ' this coming ' + data.date.format('dddd') + '.\n\nBest Wishes,\nFARFAR');
        sayToMember(data.member, 'This is a gentle reminder that *you* are scheduled ' +
          'to provide fika this coming ' + data.date.format('dddd') + '.\n\nBest Wishes,\nFARFAR',
          'You serve fika this coming ' + data.date.format('dddd'));
      } else {
        console.log('SCHEDULE: No fika this week, >= 7 days until next occasion.');
      }
    });
  });

  // The "every <fikaday> reminder" for the same day's fika.
  var sameDayReminder = schedule.scheduleJob(config.get('sameDayReminder'), function () {
    // First we must check that today is indeed the fika day (this day could have been blacklisted!)
    console.log('SCHEDULE: Fika later today job launching.');
    nextFika(function (err, data) {
      if (err) { console.log('Failed to fetch next fika info:', err); }
      if (data.date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
        sayToChannel(config.get('announceChannel'),
          'This is a gentle reminder that fika will be provided by ' + data.member.name + ' at 15:00 today.\n\nBest Wishes,\nFARFAR');
        sayToMember(data.member, 'This is a gentle reminder that *you* are scheduled ' +
          'to provide fika at 15:00 today.\n\nBest Wishes,\nFARFAR', 'You serve fika today');
      } else {
        console.log('SCHEDULE: No fika today. Next fika day is not today.');
      }
    });
  });

  // The "IT IS FUCKING FIKA RIGHT NOW reminder" when fika starts in 3 minutes.
  // Note that this also rotatis the fika schedule.
  var sameDayReminder = schedule.scheduleJob(config.get('rightNowReminder'), function () {
    console.log('SCHEDULE: Fika right now job launching.');
    nextFika(function (err, data) {
      if (err) { console.log('Failed to fetch next fika info:', err); }
      if (data.date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
        sayToChannel(config.get('announceChannel'),
          'This is the final call: Fika begins pretty much now!\n\nBest Wishes,\nFARFAR');
        members.rotate(function (err) {
          if (err) {
            console.log('Failed to rotate the fika queue!');
          }
        });
      } else {
        console.log('SCHEDULE: No fika today. Next fika day is not today.', data.date.format('YYYY-MM-DD'));
      }
   });
  });
};
