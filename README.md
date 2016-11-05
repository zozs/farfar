FARFAR
======

**Fully Automated Robotic Fika Announcer and Reminder**

FARFAR is a Slack bot which periodically sends out reminders about this weeks fika to a set of Slack users. Each week a new person is responsible for this week's fika, in a round-robin fashion.

## Usage

FARFAR listens for messages in both the #general channel and on direct messages. You can get his attention in the following ways:

 * Send a direct message in private, e.g.: `when is the next fika?`
 * Inside the #general channel by direct mention, e.g.: `@farfar when is the next fika?`

This works for all commands.

### Supported commands

FARFAR is really versatile and will try to help you with (almost) everything you need, just like a real farfar!

#### Automatically-triggered actions
FARFAR will periodically send out announcements to a public channel to remind everyone about the upcoming fikas. The default schedule is like this, assuming Thursday is the fika-day.

 * **Sunday:** A message will be sent out about the next week's upcoming fika, and who is responsible.
 * **Thursday at 10:00:** A message will be sent out to remind everyone that later today is fika.
 * **Thursday at 14:57:** A message will be sent out to remind everyone that fika starts at 15:00.

In addition to this, there are also two notifications sent only to person responsible for this week's fika. These notifications are sent both as a direct message in Slack, and as an e-mail to the e-mail address registered to the Slack account of the person.

 * **Sunday:** A message to remind you that you are responsible for fika this week.
 * **Thursday at 10:00:** A message to remind you that you are responsible for fika today.

#### Fika related commands

 * `fika/next/nästa`: If any of these words are mentioned FARFAR will respond with the next fika date, and the person responsible.

#### Member management commands

 * `add @slackuser`: Add a new member to the fika group. The initial position will be last in the fika queue.
 * `remove @slackuser`: Remove someone from the fika group.
 * `list`: List all members of the fika group. They are listed in next-fika order.
 * `move @slackuser 2`: Move user from its current position in the list to position 2 (in this case). Can be used to reorder the list.

#### Date blacklisting commands

 * `blacklist 2016-10-17`: Add the given date to the blacklist, so no fika will be served that day.
 * `whitelist 2016-10-17`: Remove the given date from the blacklist.
 * `blacklist`: List all dates in the blacklist.

#### Fun commands
You have the source code. Go get 'em :wink:

## Installation, configuration, and running

Like a real farfar, FARFAR does not want to bother you, just be of help whenever you need it. Therefore, he is easy to configure.

### Installation
```
$ git clone https://github.com/zozs/farfar.git
$ npm install
```

### Configuration

Preferably, copy `config/default.json` to `config/local.json` and perform configuration in that file. You will have to modify at least the `token` setting.

The configuration file has the following properties:

 * `token`: The token for the bot as added to your team.
 * `storageDirectory`: The directory to store configuration data in.
 * `storageKey`: The username of the bot, used when storing configuration data.
 * `fikaDay`: The day fika is served. Default is `4` which is Thursday.
 * `announceChannel`: The channel to send public fika announcements to.
 * `nodemailerTransport`: SMTP server to use for sending e-mails. See documentation for Nodemailer for further information.

### Running

Just launch the `index.js` file. You may want to use `nodemon` as well, since it is included as a dependency, if so, simply run `npm start`.

## License

FARFAR is licensed under the ISC license, see the `LICENSE` file, or the text below:

```
Copyright (c) 2016, Linus Karlsson

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
