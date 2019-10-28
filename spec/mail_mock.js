// Mock function for email module, doesn't do anything on send.

module.exports = function (config) {
  return {
    send: function (member, emailSubject, text) { }
  }
}
