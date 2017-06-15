const moment = require('moment')

// First construct mock config and controller objects.
let config = {
  get: function (key) {
    return {"hour": 14, "minute": 57, "dayOfWeek": 4} // Always return rightNowReminder key.
  }
}

const defaultInternalData = { id: 'farfar', members: ["U2PUVSEEP", "U2PUVSEEP"], blacklist: [] }

let controller = {
  lookupUserId: function (_, cb) {
    cb(null, { user: 'test', name: 'TestName', email: 'test@example.com', username: 'test' })
  },
  storage: {
    users: {
      _internalData: {},
      get: function (_, cb) {
        cb(null, controller.storage.users._internalData)
      },
      save: function (data, cb) {
        controller.storage.users._internalData = data;
        cb(null)
      }
    }
  }
}

let model = require('../model')(config, controller)

describe('delay once when today is', function () {
  const datePairs = [
    { input: '2017-06-11 12:00:00', output: '2017-06-15', name: 'a Sunday' },
    { input: '2017-06-12 12:00:00', output: '2017-06-15', name: 'a Monday' },
    { input: '2017-06-13 12:00:00', output: '2017-06-15', name: 'a Tuesday' },
    { input: '2017-06-14 12:00:00', output: '2017-06-15', name: 'a Wednesday' },
    { input: '2017-06-15 09:00:00', output: '2017-06-15', name: 'a Thursday at 09:00' },
    { input: '2017-06-15 10:00:00', output: '2017-06-15', name: 'a Thursday at 10:00' },
    { input: '2017-06-15 12:00:00', output: '2017-06-15', name: 'a Thursday at 12:00' },
    { input: '2017-06-15 13:00:00', output: '2017-06-15', name: 'a Thursday at 13:00' },
    { input: '2017-06-15 14:00:00', output: '2017-06-15', name: 'a Thursday at 14:00' },
    { input: '2017-06-15 15:00:00', output: '2017-06-22', name: 'a Thursday at 15:00' },
    { input: '2017-06-15 16:00:00', output: '2017-06-22', name: 'a Thursday at 16:00' },
    { input: '2017-06-15 17:00:00', output: '2017-06-22', name: 'a Thursday at 17:00' },
    { input: '2017-06-16 12:00:00', output: '2017-06-22', name: 'a Friday' },
    { input: '2017-06-17 12:00:00', output: '2017-06-22', name: 'a Saturday' },
    { input: '2017-06-18 12:00:00', output: '2017-06-22', name: 'a Sunday next week' }
  ]

  beforeEach(function () {
    // reset the state of the controller storage.
    controller.storage.users._internalData = JSON.parse(JSON.stringify(defaultInternalData))
  })

  datePairs.map(function (testCase) {
    it(testCase.name, function () {
      let today = moment(testCase.input).toDate()
      jasmine.clock().mockDate(today)

      model.blacklist.delayOnce(function (err, data) {
        expect(err).toBeNull()
        expect(data.date.format('YYYY-MM-DD')).toEqual(testCase.output)
        expect(controller.storage.users._internalData.blacklist).toEqual([testCase.output])
      })
    })
  })
})

describe('delay until for', function () {
  const datePairs = [
    { today: '2017-06-12 12:00:00', input: '2017-06-14', output: [], name: 'Monday to Wednesday' },
    { today: '2017-06-13 12:00:00', input: '2017-06-15', output: ['2017-06-15'], name: 'Tuesday to Thursday' },
    { today: '2017-06-14 12:00:00', input: '2017-06-16', output: ['2017-06-15'], name: 'Wednesday to Thursday' },
    { today: '2017-06-15 12:00:00', input: '2017-06-15', output: ['2017-06-15'], name: 'Thursday to itself before fika' },
    { today: '2017-06-15 14:00:00', input: '2017-06-17', output: ['2017-06-15'], name: 'Thursday to Saturday' },
    { today: '2017-06-15 15:00:00', input: '2017-06-15', output: ['2017-06-22'], name: 'Thursday to itself after fika' },
    { today: '2017-06-15 17:00:00', input: '2017-06-22', output: ['2017-06-22'], name: 'Thursday to next Thursday' },
    { today: '2017-06-16 12:00:00', input: '2017-06-28', output: ['2017-06-22'], name: 'Thursday to Wednesday two weeks ahead' },
    { today: '2017-06-17 12:00:00', input: '2017-06-29', output: ['2017-06-22', '2017-06-29'], name: 'Thursday to Thursday two weeks ahead' },
    { today: '2017-06-18 12:00:00', input: '2017-06-30', output: ['2017-06-22', '2017-06-29'], name: 'Thursday to Friday two weeks ahead' },
    { today: '2017-06-18 12:00:00', input: '2017-07-07', output: ['2017-06-22', '2017-06-29', '2017-07-06'], name: 'Thursday to Friday three weeks ahead' },
  ]

  beforeEach(function () {
    // reset the state of the controller storage.
    controller.storage.users._internalData = JSON.parse(JSON.stringify(defaultInternalData))
  })

  datePairs.map(function (testCase) {
    it(testCase.name, function () {
      let today = moment(testCase.today).toDate()
      jasmine.clock().mockDate(today)

      model.blacklist.delayUntil(testCase.input, function (err, data) {
        expect(err).toBeNull()
        expect(data.dates.map(d => d.format('YYYY-MM-DD'))).toEqual(testCase.output)
      })
    })
  })

  it('over a year', function () {
    /* to avoid inifinite loops, only a maximum of 52 weeks delay are allowed before failing. */
    let today = moment('2017-06-11 12:00:00').toDate()
    jasmine.clock().mockDate(today)

    model.blacklist.delayUntil('2018-06-15', function (err, data) {
      expect(err).toEqual('Invalid date or too far in the future')
      expect(data).toBeNull()
    })
  })
})
