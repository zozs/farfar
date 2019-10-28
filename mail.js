const nodemailer = require('nodemailer')

module.exports = function (config) {
  // Prepare e-mail transport.
  const transporter = nodemailer.createTransport(config.get('nodemailerTransport'))
  const mailFrom = config.get('mailFrom')
  
  return {
    send: function (member, emailSubject, text) {
      const mailOptions = {
        from: mailFrom,
        to: `"${member.name}" <${member.email}>`,
        bcc: mailFrom,
        subject: emailSubject,
        text: text
      }
      transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log('Failed to send e-mail:', err)
        }
      })
    }
  }
}
