const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'groupinfo',
    aliases: ['ginfo', 'threadinfo', 'gc'],
    description: 'Get group information with stylish output',
    usage: 'groupinfo',
    category: 'Group',
    groupOnly: true,
    prefix: true
  },
  
  async run({ api, event, send, Threads }) {
    const { threadID, messageID } = event;
    
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const dbThread = Threads.get(threadID);
      
      const admins = threadInfo.adminIDs || [];
      const members = threadInfo.participantIDs || [];
      
      let adminNames = [];
      for (const admin of admins.slice(0, 5)) {
        try {
          const info = await api.getUserInfo(admin.id);
          let name = info[admin.id]?.name;
          if (!name || name.toLowerCase() === 'facebook user' || name.toLowerCase() === 'facebook') {
            name = info[admin.id]?.firstName;
            if (!name || name.toLowerCase() === 'facebook') {
              name = 'Admin';
            }
          }
          adminNames.push(name);
        } catch {
          adminNames.push('Admin');
        }
      }
      
      const approved = dbThread?.approved === 1 ? '✅ Yes' : '❌ No';
      const banned = dbThread?.banned === 1 ? '🚫 Yes' : '✅ No';
      
      const msg = `
╔══════════════════════╗
║  𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍  ║
╠══════════════════════╣
║ 📛 𝐍𝐚𝐦𝐞:
║ ${threadInfo.threadName || 'No Name'}
╠══════════════════════╣
║ 🆔 𝐓𝐡𝐫𝐞𝐚𝐝 𝐈𝐃:
║ ${threadID}
╠══════════════════════╣
║ 👥 𝐌𝐞𝐦𝐛𝐞𝐫𝐬: ${members.length}
║ 👨‍💼 𝐀𝐝𝐦𝐢𝐧𝐬: ${admins.length}
╠══════════════════════╣
║ 😀 𝐄𝐦𝐨𝐣𝐢: ${threadInfo.emoji || '👍'}
║ 🔒 𝐀𝐩𝐩𝐫𝐨𝐯𝐚𝐥: ${threadInfo.approvalMode ? 'Required' : 'Off'}
╠══════════════════════╣
║ 🤖 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬:
║ Approved: ${approved}
║ Banned: ${banned}
╠══════════════════════╣
║ 👑 𝐓𝐨𝐩 𝐀𝐝𝐦𝐢𝐧𝐬:
${adminNames.map((n, i) => `║ ${i + 1}. ${n}`).join('\n')}
╚══════════════════════╝
      `.trim();
      
      if (threadInfo.imageSrc) {
        const cacheDir = path.join(__dirname, 'cache');
        fs.ensureDirSync(cacheDir);
        const imgPath = path.join(cacheDir, `groupimg_${Date.now()}.jpg`);
        
        try {
          const response = await axios.get(threadInfo.imageSrc, { 
            responseType: 'arraybuffer',
            timeout: 10000 
          });
          fs.writeFileSync(imgPath, Buffer.from(response.data));
          
          await api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(imgPath)
          }, threadID, () => {}, messageID);
          
          try { fs.unlinkSync(imgPath); } catch {}
        } catch (imgError) {
          try { fs.unlinkSync(imgPath); } catch {}
          return send.reply(msg);
        }
      } else {
        return send.reply(msg);
      }
    } catch (error) {
      return send.reply('❌ Failed to get group info: ' + error.message);
    }
  }
};
