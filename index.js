/**
 * NodeJS Twitch Permit-Bot via tmi.js
 *
 * @author    Jonas Berner <admin@jonas-berner.de>
 * @version   1.0.2
 * @copyright 04.02.2021 Jonas Berner
 */
console.log(`EchtkPvL Twitch Permit-Bot (NodeJS ${process.version})`);
let tmi, client;
var config;
var permit_obj = [];
let { Resolver } = require('dns').promises;
let dns = new Resolver({'timeout': 750});
dns.setServers(['1.1.1.1', '8.8.8.8']);

try {
    tmi = require('tmi.js');
    config = require("./config");
} catch(error) {
    console.log("Requirements missing! Try: npm install");
    console.log(error);
    process.exit(1);
}

// ---------------------------
// Setup
// ---------------------------
client = new tmi.Client({
    options: {
        debug: false
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: config.username,
        password: config.token
    },
    channels: config.channels
});
client.connect();

client.on('connected', (address, port) => {
    console.log(`Connected: ${address}:${port}`);
    client.color('Red');
});

client.on('join', (channel, username, self) => {
    if(self) console.log(`${username} joined ${channel}`);
});

client.on('notice', (channel, msgid, message) => {
    console.log(`notice: [${channel}] ${msgid} => ${message}`);
});

process.on('SIGINT', function() {
    client.disconnect();
    console.log("SIGINT");
    process.exit();
});

// ---------------------------
// chat, action or whisper
// ---------------------------
client.on('message', (channel, userstate, message, self) => {
    if(self) return;

    check_link(channel, userstate, message, self); // Link-Protection
    commands(channel, userstate, message, self);
});

// ---------------------------
// Functions
// ---------------------------
function commands(channel, userstate, message, self) {
    if(userstate["message-type"] == "whisper") return;
    if(!message.startsWith('!') && !message.startsWith('#')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    switch(command){
        case "permit":
            cmd_permit(channel, userstate, message, self, args, command);
            break;

        case "echo":
            client.say(channel, `@${userstate.username}, you said: "${args.join(' ')}"`);
            break;

        default:
            return false;
    }

    console.log(`[${channel}][CMD] ${userstate['display-name']}: ${message}`);
}

function cmd_permit(channel, userstate, message, self, args, command) {
    var authorized = false;
    var user = args[0].toLowerCase().replace('@', '');

    if(userstate.badges !== null){
        if(userstate.badges.moderator) authorized = true; // Mod
        if(userstate.badges.broadcaster) authorized = true; // Streamer
        if(userstate.badges.admin) authorized = true; // Twitch-Admin
        if(userstate.badges.global_mod) authorized = true; // Global Mod
        if(userstate.badges.staff) authorized = true; // Twitch-Staff
    }

    if(!authorized) return false;

    var delay = 60;
    if(args.length >= 2 && !isNaN(args[1]) && args[1] <= 3600) delay = args[1];

    permit_obj[user] = new Date().getTime() + (delay * 1000);

    client.say(channel, `@${user} you are now permited to post links for ${delay} seconds`);
}

setInterval(() => {
    for (const property in permit_obj)
        if(new Date().getTime() >= permit_obj[property])
            delete permit_obj[property];
}, 30 * 60 * 1000);

async function check_link(channel, userstate, message, self) {
    var permit = false;
    var user = userstate.username;

    if(userstate.badges !== null){
        if(userstate.badges.moderator) permit = true; // Mod
        if(userstate.badges.subscriber) permit = true; // Sub
        if(userstate.badges.broadcaster) permit = true; // Streamer
        if(userstate.badges.admin) permit = true; // Twitch-Admin
        if(userstate.badges.global_mod) permit = true; // Global Mod
        if(userstate.badges.staff) permit = true; // Twitch-Staff
    }

    var RegEx = /([\d\w\- ]+\.)*([\d\w\- ]+\.[ ]*[a-z]{2,})/;
    var match = RegEx.exec(message.toLowerCase());
    if (match === null) return;

    console.log(`[${channel}] Link detected: ${message}`);
    var plain_link = match[2].replace(/\s/g, '');

    // Whitelist
    switch(plain_link){
        case "twitch.tv":
        case "echtkpvl.de":
        case "github.com":
            console.log(`[${channel}] Link in Whitelist: ${plain_link}`);
            return;
    }

    try {
        await dns.resolveNs(plain_link);
    } catch(error) {
        permit = true;
        console.log(`[${channel}] Resolve-Error: ${error.code} (${plain_link})`);
    }

    if(permit) return;

    if(!isNaN(permit_obj[user]) && new Date().getTime() <= permit_obj[user]){
        return;
    } else {
        client.deletemessage(channel, userstate.id);
        client.action(channel, `@${user} you are not permited to post links!`);
    }
}

// EOF
