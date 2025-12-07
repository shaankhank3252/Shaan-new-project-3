const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: 'prefix',
    aliases: ['px'],
    description: 'Show or set the bot prefix',
    usage: 'prefix',
    category: 'Utility',
    prefix: false
  },
  
  async run({ api, event, send, config, client, Users }) {
    const { threadID, messageID, senderID } = event;
    
    const uniqueCommands = new Set();
    if (client && client.commands) {
      client.commands.forEach((cmd, key) => {
        if (cmd.config && cmd.config.name) {
          uniqueCommands.add(cmd.config.name.toLowerCase());
        }
      });
    }
    const commandCount = uniqueCommands.size || 102;
    
    const now = moment().tz('Asia/Karachi');
    const time = now.format('hh:mm:ss A');
    const date = now.format('DD/MM/YYYY');
    
    const startTime = global.startTime || Date.now();
    const uptime = Date.now() - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    let latestCommand = 'N/A';
    try {
      const commandsPath = path.join(__dirname, '.');
      const files = fs.readdirSync(commandsPath)
        .filter(f => f.endsWith('.js'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(commandsPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      if (files.length > 0) {
        latestCommand = files[0].name;
      }
    } catch (e) {}
    
    let senderName = 'User';
    try {
      if (Users && Users.getNameUser) {
        senderName = await Users.getNameUser(senderID);
      }
    } catch (e) {}
    
    const cardMessage = `==[ ${time} || ${date} ]==
🌌 ${config.BOTNAME || 'Muskan'} Hello!
─────────────────
👤 ${senderName}
📊 Commands: ${commandCount}
🔧 Prefix: ${config.PREFIX}
⏰ Uptime: ${hours}h ${minutes}m ${seconds}s
📁 Latest: ${latestCommand}
─────────────────
Type ${config.PREFIX}help for commands`;

    api.sendMessage(cardMessage, threadID, (err, info) => {
      if (!err && info && info.messageID) {
        setTimeout(() => {
          try { api.unsendMessage(info.messageID); } catch (e) {}
        }, 10000);
      }
    }, messageID);
  }
};
