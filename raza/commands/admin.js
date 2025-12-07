module.exports = {
  config: {
    name: 'admin',
    aliases: ['admins', 'botadmin'],
    description: 'Manage bot admins',
    usage: 'admin [add/remove/list] [uid]',
    category: 'Admin',
    adminOnly: true,
    prefix: true
  },
  
  async run({ api, event, args, send, config }) {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'list') {
      const admins = config.ADMINBOT || [];
      let msg = `BOT ADMINS (${admins.length})\n─────────────────\n`;
      
      for (let i = 0; i < admins.length; i++) {
        try {
          const info = await api.getUserInfo(admins[i]);
          let name = info[admins[i]]?.name;
          if (!name || name.toLowerCase() === 'facebook user' || name.toLowerCase() === 'facebook') {
            name = info[admins[i]]?.firstName;
            if (!name || name.toLowerCase() === 'facebook') {
              name = 'Admin';
            }
          }
          msg += `${i + 1}. ${name}\n   UID: ${admins[i]}\n`;
        } catch {
          msg += `${i + 1}. UID: ${admins[i]}\n`;
        }
      }
      
      return send.reply(msg);
    }
    
    const uid = args[1];
    
    if (!uid || !/^\d+$/.test(uid)) {
      return send.reply('Please provide a valid UID.');
    }
    
    const fs = require('fs-extra');
    const path = require('path');
    const configPath = path.join(__dirname, '../../Data/config/envconfig.json');
    let envConfig = fs.readJsonSync(configPath);
    
    if (action === 'add') {
      if (envConfig.ADMINBOT.includes(uid)) {
        return send.reply('This user is already an admin.');
      }
      
      envConfig.ADMINBOT.push(uid);
      fs.writeJsonSync(configPath, envConfig, { spaces: 2 });
      
      let name = 'User';
      try {
        const info = await api.getUserInfo(uid);
        const rawName = info[uid]?.name;
        if (rawName && rawName.toLowerCase() !== 'facebook user' && rawName.toLowerCase() !== 'facebook') {
          name = rawName;
        } else if (info[uid]?.firstName && info[uid].firstName.toLowerCase() !== 'facebook') {
          name = info[uid].firstName;
        }
      } catch {}
      
      return send.reply(`Added ${name} (${uid}) as bot admin.`);
    }
    
    if (action === 'remove' || action === 'del') {
      if (!envConfig.ADMINBOT.includes(uid)) {
        return send.reply('This user is not an admin.');
      }
      
      if (envConfig.ADMINBOT.length === 1) {
        return send.reply('Cannot remove the last admin.');
      }
      
      envConfig.ADMINBOT = envConfig.ADMINBOT.filter(id => id !== uid);
      fs.writeJsonSync(configPath, envConfig, { spaces: 2 });
      
      return send.reply(`Removed ${uid} from bot admins.`);
    }
    
    return send.reply('Usage: admin [add/remove/list] [uid]');
  }
};
