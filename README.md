# twitch-mybot
My Twitch Bot. For every function you can set a cooldown, so user aren't able to spam a command.

## Functions
- Remove links from chat (`!permit [username] [duration]`)
- `!echo` Repeats the message
- `!uhr` Writes the kurrent time
- `!debug` Writes some debug-lines in the chat
- `!social` Show links to socialmedia sites

### Aliases
- `!uhr`
    - `!uhrzeit`
- `!social`
    - `!hp`
    - `!socials`
    - `!website`
    - `!webseite`
    - `!homepage`


## Setup
Clone repository: `git clone git@github.com:EchtkPvL/twitch-mybot.git`

Change directory: `cd twitch-mybot/`

Install needed modules: `npm install`

Copy `config.js.example` to `config.js` and insert credentials.

Start Bot: `node index.js`

## Known issues
```
TypeError: Cannot read property 'resolveNs' of undefined
    at check_link (/home/echtkpvl/twitch-mybot/index.js:151:34)
    at client.on (/home/echtkpvl/twitch-mybot/index.js:72:9)
    at client.EventEmitter.emit (/home/echtkpvl/twitch-mybot/node_modules/tmi.js/lib/events.js:101:25)
    at client.EventEmitter.emits (/home/echtkpvl/twitch-mybot/node_modules/tmi.js/lib/events.js:64:19)
    at client.handleMessage (/home/echtkpvl/twitch-mybot/node_modules/tmi.js/lib/client.js:1003:34)
    at parts.forEach (/home/echtkpvl/twitch-mybot/node_modules/tmi.js/lib/client.js:1080:36)
    at Array.forEach (<anonymous>)
    at client._onMessage (/home/echtkpvl/twitch-mybot/node_modules/tmi.js/lib/client.js:1079:11)
    at WebSocket.onMessage (/home/echtkpvl/twitch-mybot/node_modules/ws/lib/event-target.js:120:16)
    at emitOne (events.js:116:13)
```
Fix: Update NodeJS (I'm using v14.15.0)

## Copyright
Note that this repository is distributed under the MIT License. See `LICENSE` for details.
