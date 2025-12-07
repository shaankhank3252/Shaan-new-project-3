module.exports = {
  config: {
    name: 'uidall',
    aliases: ['alluid', 'memberuids'],
    description: 'Get all member UIDs',
    usage: 'uidall',
    category: 'Utility',
    groupOnly: true,
    prefix: true
  },
  
  async run({ api, event, send }) {
    const { threadID } = event;
    
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs || [];
      
      let msg = `GROUP MEMBER UIDs (${members.length})
─────────────────\n`;
      
      for (let i = 0; i < Math.min(members.length, 30); i++) {
        const uid = members[i];
        let name = 'Member';
        try {
          const info = await api.getUserInfo(uid);
          const rawName = info[uid]?.name;
          if (rawName && rawName.toLowerCase() !== 'facebook user' && rawName.toLowerCase() !== 'facebook') {
            name = rawName;
          } else if (info[uid]?.firstName && info[uid].firstName.toLowerCase() !== 'facebook') {
            name = info[uid].firstName;
          }
        } catch {}
        msg += `${i + 1}. ${name}\n   ${uid}\n`;
      }
      
      if (members.length > 30) {
        msg += `\n... and ${members.length - 30} more members`;
      }
      
      return send.reply(msg);
    } catch (error) {
      return send.reply('Failed to get member UIDs.');
    }
  }
};
