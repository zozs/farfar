var async = require('async');
var moment = require('moment');

module.exports = function (config, controller) {
  var funcs = {};

  const FARFAR_USER = config.get('storageKey');

  var getData = function (cb) {
    controller.storage.users.get(FARFAR_USER, cb);
  };

  // Fika logic.
  funcs.nextFika = function (cb) {
    // Returns next fika as {date: {momentdateobj}, member: {...} } to the callback.
    getData(function (err, data) {
      if (err) { cb(err); return; }
      if (data.members.length == 0) { cb("no users"); return; }
      // Find date of next Thursday (or other fikaDay) not blacklisted.
      // We only consider minute-based precision, to avoid nasty timing errors.
      var now = moment().second(0).millisecond(0)
      var sameDay = config.get('rightNowReminder');
      var fikaDay = sameDay.dayOfWeek;
      do {
        var nextFikaDate = moment(now).day(fikaDay).hour(sameDay.hour).minute(sameDay.minute).second(0).millisecond(0)
        fikaDay += 7;
      } while (nextFikaDate < now || data.blacklist.indexOf(nextFikaDate.format('YYYY-MM-DD')) >= 0);
      
      controller.lookupUserId(data.members[0], function (err, user) {
        if (err) { cb('no such user to serve fika!'); return; }
        cb(null, { date: nextFikaDate, member: user });
      });
    });
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

  // Member and blacklist logic.
  funcs.blacklist = {
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
    },
    delayOnce: function (cb) {
      funcs.nextFika(function (err, data) {
        if (err) { return cb(err) }
        funcs.blacklist.add(data.date.format('YYYY-MM-DD'), err => cb(err, data))
      })
    },
    delayUntil: function (untilStr, cb) {
      const sameDay = config.get('rightNowReminder')
      let iterations = 0
      let until = moment(untilStr)
      until.hour(sameDay.hour).minute(sameDay.minute).second(0).millisecond(0)
      let addedDelays = []
      let oneMoreDelay = () => {
        iterations += 1
        if (iterations >= 52) {
          // To avoid infinite loops
          // We must also remove dates already added to blacklist to tidy up.
          async.eachSeries(addedDelays, funcs.blacklist.remove, (err) => {
            if (err) {
              cb('Invalid date or too far in the future. Also failed cleanup!')
            } else {
              cb('Invalid date or too far in the future')
            }
          })
          return
        }

        funcs.nextFika((err, data) => {
          if (err) { return cb(err) }
          if (data.date <= until) {
            // We need to add one more date to the blacklist.
            funcs.blacklist.add(data.date.format('YYYY-MM-DD'), (err) => {
              if (err) { return cb(err) }
              addedDelays.push(data.date.format('YYYY-MM-DD'))
              oneMoreDelay()
            })
          } else {
            // We have delayed enough!
            cb(null, { dates: addedDelays })
          }
        })
      }
      oneMoreDelay()
    }
  };

  funcs.modifyWhitelist = {
    add: function (userid, cb) {
      manipulateData(cb, function (data, cb2) {
        // Do a lookup to see if the user exists.
        controller.lookupUserId(userid, function (err, user) {
          if (err) { cb2(err); return; }
          data.modifyWhitelist.push(userid);
          cb2(null, data, user);
        });
      });
    },
    remove: function (userid, cb) {
      manipulateData(cb, function (data, cb2) {
        let before = data.modifyWhitelist.length;
        data.modifyWhitelist = data.modifyWhitelist.filter(current => current != userid);
        let after = data.modifyWhitelist.length;
        if (after < before) {
          controller.lookupUserId(userid, function (err, user) {
            if (!err) {
              cb2(null, data, user);
            } else {
              cb2(null, data, { id: userid, name: userid, username: userid, email: '' });
            }
          });
        } else {
          cb2("No such user found to remove from admin list");
        }
      });
    },
    valid: function (userid, cb) {
      // Valid if either whitelist empty, or if in whitelist.
      controller.storage.users.get(FARFAR_USER, function (err, data) {
        if (err) { cb(err); return; }
        if (data.modifyWhitelist.length == 0 || data.modifyWhitelist.indexOf(userid) > -1) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      });
    },
    list: function (cb) {
      controller.storage.users.get(FARFAR_USER, function (err, data) {
        if (err) { cb(err); return; }
        async.mapSeries(data.modifyWhitelist, controller.lookupUserId, function (err, users) {
          if (err) { cb('The admin list contains at least one invalid user id!'); return; }
          cb(null, users);
        });
      });
    }
  };

  funcs.members = {
    add: function (userid, cb) {
      manipulateData(cb, function (data, cb2) {
        // Do a lookup to see if the user exists.
        controller.lookupUserId(userid, function (err, user) {
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
          controller.lookupUserId(userid, function (err, user) {
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
        controller.lookupUserId(userid, function (err, user) {
          if (!err) {
            cb2(null, data, user);
          } else {
            cb2(null, data, { id: userid, name: userid, username: userid, email: '' });
          }
        });
      });
    },
    rotate: function (cb) {
      manipulateData(cb, function (data, cb2) {
        data.members.push(data.members.shift());
        cb2(null, data);
      });
    },
    list: function (cb) {
      controller.storage.users.get(FARFAR_USER, function (err, data) {
        if (err) { cb(err); return; }
        async.mapSeries(data.members, controller.lookupUserId, function (err, users) {
          if (err) { cb('The user list contains at least one invalid user id!'); return; }
          cb(null, users);
        });
      });
    }
  };

  return funcs;
};

