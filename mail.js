var nodemailer = require('nodemailer');

module.exports = function (config) {
  // Prepare e-mail transport.
  var transporter = nodemailer.createTransport(config.get('nodemailerTransport'));
  
  return {
    send: function (member, emailSubject, text) {
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
};
