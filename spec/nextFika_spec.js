const moment = require('moment')

// First construct mock config and controller objects.
var config = {
  get: function (key) {
    return {"hour": 14, "minute": 57, "dayOfWeek": 4} // Always return rightNowReminder key.
  }
}

var controller = {
  lookupUserId: function (_, cb) {
    cb(null, { user: 'test', name: 'TestName', email: 'test@example.com', username: 'test' })
  },
  storage: {
    users: {
      get: function (_, cb) {
        cb(null, { id: 'farfar', members: ["U2PUVSEEP", "U2PUVSEEP"], blacklist: [] })
      }
    }
  }
}

var model = require('../model')(config, controller)

describe('nextFika date when today is', function () {
  const datePairs = [
    { input: '2016-12-11 12:00:00', output: '2016-12-15', name: 'a Sunday' },
    { input: '2016-12-12 12:00:00', output: '2016-12-15', name: 'a Monday' },
    { input: '2016-12-13 12:00:00', output: '2016-12-15', name: 'a Tuesday' },
    { input: '2016-12-14 12:00:00', output: '2016-12-15', name: 'a Wednesday' },
    { input: '2016-12-15 09:00:00', output: '2016-12-15', name: 'a Thursday at 09:00' },
    { input: '2016-12-15 10:00:00', output: '2016-12-15', name: 'a Thursday at 10:00' },
    { input: '2016-12-15 12:00:00', output: '2016-12-15', name: 'a Thursday at 12:00' },
    { input: '2016-12-15 13:00:00', output: '2016-12-15', name: 'a Thursday at 13:00' },
    { input: '2016-12-15 14:00:00', output: '2016-12-15', name: 'a Thursday at 14:00' },
    { input: '2016-12-15 15:00:00', output: '2016-12-22', name: 'a Thursday at 15:00' },
    { input: '2016-12-15 16:00:00', output: '2016-12-22', name: 'a Thursday at 16:00' },
    { input: '2016-12-15 17:00:00', output: '2016-12-22', name: 'a Thursday at 17:00' },
    { input: '2016-12-16 12:00:00', output: '2016-12-22', name: 'a Friday' },
    { input: '2016-12-17 12:00:00', output: '2016-12-22', name: 'a Saturday' },
    { input: '2016-12-18 12:00:00', output: '2016-12-22', name: 'a Sunday next week' }
  ]

  datePairs.map(function (testCase) {
    it(testCase.name, function (done) {
      let today = moment(testCase.input).toDate()
      jasmine.clock().mockDate(today)

      model.nextFika(function (err, data) {
        expect(err).toBeNull()
        expect(data.date.format('YYYY-MM-DD')).toEqual(testCase.output)
        done()
      })
    })
  })
})

describe('nextFika date and time matches', function () {
  it('right now reminder', function (done) {
    let today = moment('2017-06-18 10:31:00').toDate()
    jasmine.clock().mockDate(today)

    model.nextFika(function (err, data) {
      expect(err).toBeNull()
      expect(data.date.format('YYYY-MM-DD HH:mm:ss')).toEqual('2017-06-22 14:57:00')
      done()
    })
  })
})
