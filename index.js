/**
 * NodeJS Twitch Permit-Bot via tmi.js
 *
 * @author    Jonas Berner <admin@jonas-berner.de>
 * @version   1.0.5
 * @copyright 04.02.2021 Jonas Berner
 */
console.log(`EchtkPvL Twitch Permit-Bot (NodeJS ${process.version})`);
let tmi, client;
var config;
var timer_obj = [];
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
    if(userstate["message-type"] == "whisper") return;

    check_link(channel, userstate, message, self); // Link-Protection
    commands(channel, userstate, message, self);
    checkCaptials(channel, userstate, message, self);
});

// ---------------------------
// Functions
// ---------------------------
function commands(channel, userstate, message, self) {
    if(!message.startsWith('!') && !message.startsWith('#')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();
    const user = userstate['display-name'];

    if(
        (!isNaN(timer_obj[user + command]) && new Date().getTime() < timer_obj[user + command])
        || (!isNaN(timer_obj[command]) && new Date().getTime() < timer_obj[command])
        || (!isNaN(timer_obj[user]) && new Date().getTime() < timer_obj[user])
    ){
        client.say(channel, `@${user} you are on cooldown!`);
        return;
    }

    switch(command){
        case "help":
        case "commands":
            timer_obj[command] = new Date().getTime() + (15 * 1000);
            client.say(channel, `Commands: !echo !debug !uhr !social`);
            break;

        case "permit":
            cmd_permit(channel, userstate, message, self, args, command);
            break;

        case "false":
            timer_obj[user + command] = new Date().getTime() + (15 * 1000);
            client.say(channel, `It's funny because it's true :D @${user}`);
            break;

        case "echo":
            timer_obj[user + command] = new Date().getTime() + (15 * 1000);
            client.say(channel, `@${user}, you said: "${args.join(' ')}"`);
            break;

        case "debug":
            timer_obj[user + command] = new Date().getTime() + (60 * 1000);
            client.say(channel, JSON.stringify(userstate));
            break;

        case "sounds":
            timer_obj[user + command] = new Date().getTime() + (60 * 1000);
            client.say(channel, "https://jvpeek.de/ext/sb/soundlist/?channel=echtkpvl");
            break;

        case "uhr":
        case "uhrzeit":
            uhrzeit = new Date().toISOString().replace(/\d{4}-\d{2}-\d{2}T/, '').replace(/\..+/, '');
            timer_obj[user + command] = new Date().getTime() + (10 * 1000);
            client.say(channel, `Hi ${user}, hier die Uhrzeit: ${uhrzeit}`);
            break;

        case "hp":
        case "social":
        case "socials":
        case "website":
        case "webseite":
        case "homepage":
            if(!isNaN(timer_obj[user + "social"]) && new Date().getTime() < timer_obj[user + "social"]){
                client.say(channel, `@${user} you are on cooldown!`);
                return;
            }

            timer_obj[user + "social"] = new Date().getTime() + (30 * 1000);
            client.action(channel, `Homepage: https://echtkpvl.de - Twitter: https://twitter.com/EchtkPvL - GitHub: https://github.com/EchtkPvL - Insta: https://www.instagram.com/echtkpvl`);
            break;

        default:
            return false;
    }

    console.log(`[${channel}][CMD] ${user}: ${message}`);
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

function checkCaptials(channel, userstate, message, self) {
    var count = message.replace(/\s/g, '').length;
    var countRaw = message.replace(/\s/g, '').length;
    var countCapitals = 0;

    for (const key in userstate['emotes']){
        for (const value in userstate['emotes'][key]){
            emote = userstate['emotes'][key][value].split('-');
            start = parseInt(emote[0]);
            end = parseInt(emote[1]);
            tmp = message.substr(start, (end - start) + 1);
            countRaw -= tmp.replace(/\s/g, '').length;
            countCapitals -= tmp.length - tmp.replace(/[A-Z]/g, '').length;
        }
    }

    countCapitals += count - message.replace(/\s/g, '').replace(/[A-Z]/g, '').length;
    if((countCapitals / countRaw) >= 0.9 && countRaw >= 10){
        client.deletemessage(channel, userstate.id);
        client.action(channel, `@${userstate['display-name']} stop spamming caps!`);
    }
}

setInterval(() => {
    for (const property in permit_obj)
        if(new Date().getTime() >= permit_obj[property])
            delete permit_obj[property];

    for (const property in timer_obj)
        if(new Date().getTime() >= timer_obj[property])
            delete timer_obj[property];
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
