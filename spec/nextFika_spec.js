var moment = require('moment');


// First construct mock config and controller objects.
var config = {
  get: function (key) {
    return {"hour": 14, "minute": 57, "dayOfWeek": 4}; // Always return rightNowReminder key.
  }
};

var controller = {
  lookupUserId: function (_, cb) {
    cb(null, { user: 'test', name: 'TestName', email: 'test@example.com', username: 'test' });
  },
  storage: {
    users: {
      get: function (_, cb) {
        cb(null, { id: 'farfar', members: ["U2PUVSEEP", "U2PUVSEEP"], blacklist: [] });
      }
    }
  }
};

var model = require('../model')(config, controller);

describe("nextFika result when today is", function () {
  it("a Sunday", function () {
    let today = moment('2016-12-11 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Monday", function () {
    let today = moment('2016-12-12 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Tuesday", function () {
    let today = moment('2016-12-13 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Wednesday", function () {
    let today = moment('2016-12-14 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
 
  it("a Thursday at 09:00", function () {
    let today = moment('2016-12-15 09:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });

  it("a Thursday at 10:00", function () {
    let today = moment('2016-12-15 10:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });

  it("a Thursday at 12:00", function () {
    let today = moment('2016-12-15 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Thursday at 13:00", function () {
    let today = moment('2016-12-15 13:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Thursday at 14:00", function () {
    let today = moment('2016-12-15 14:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-15');
    });
  });
  
  it("a Thursday at 15:00", function () {
    let today = moment('2016-12-15 15:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });
  
  it("a Thursday at 16:00", function () {
    let today = moment('2016-12-15 16:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });
  
  it("a Thursday at 17:00", function () {
    let today = moment('2016-12-15 17:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });
  
  it("a Friday", function () {
    let today = moment('2016-12-16 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });
  
  it("a Saturday", function () {
    let today = moment('2016-12-17 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });  

  it("a Sunday next week", function () {
    let today = moment('2016-12-18 12:00:00').toDate();
    jasmine.clock().mockDate(today);

    model.nextFika(function (err, data) {
      expect(err).toBeNull();
      expect(data.date.format('YYYY-MM-DD')).toEqual('2016-12-22');
    });
  });
});
