const ws3fca = require('ws3-fca');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios');

const logs = require('./Data/utility/logs');
const listen = require('./Data/system/listen');
const { loadCommands, loadEvents } = require('./Data/system/handle/handleRefresh');
const UsersController = require('./Data/system/controllers/users');
const ThreadsController = require('./Data/system/controllers/threads');
const CurrenciesController = require('./Data/system/controllers/currencies');

const configPath = path.join(__dirname, 'Data/config/envconfig.json');
const appstatePath = path.join(__dirname, 'appstate.json');
const islamicPath = path.join(__dirname, 'Data/config/islamic_messages.json');
const commandsPath = path.join(__dirname, 'raza/commands');
const eventsPath = path.join(__dirname, 'raza/events');

let config = {};
let islamicMessages = {};
let api = null;
let client = {
  commands: new Map(),
  events: new Map(),
  replies: new Map(),
  cooldowns: new Map()
};

const quranPics = [
  'https://i.ibb.co/8gWzFpqV/bbc9bf12376e.jpg',
  'https://i.ibb.co/DgGmLMTL/2a27f2cecc80.jpg',
  'https://i.ibb.co/Kz8CBZBD/db27a4756c35.jpg',
  'https://i.ibb.co/zTKnLMq9/c52345ec3639.jpg',
  'https://i.ibb.co/8gfGBHDr/8e3226ab3861.jpg',
  'https://i.ibb.co/WNK2Dbbq/ffed087e09a5.jpg',
  'https://i.ibb.co/hRVXMQhz/fe5e09877fa8.jpg'
];

const namazPics = [
  'https://i.ibb.co/sp39k0CY/e2630b0f2713.jpg',
  'https://i.ibb.co/BKdttjgN/8cd831a43211.jpg',
  'https://i.ibb.co/Q3hVDVMr/c0de33430ba4.jpg',
  'https://i.ibb.co/7td1kK7W/6d713bbe5418.jpg'
];

const quranAyats = [
  {
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    urdu: "اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    surah: "Surah Al-Fatiha: 1"
  },
  {
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    urdu: "بے شک مشکل کے ساتھ آسانی ہے",
    surah: "Surah Ash-Sharh: 6"
  },
  {
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    urdu: "اور جو اللہ پر توکل کرے تو وہ اسے کافی ہے",
    surah: "Surah At-Talaq: 3"
  },
  {
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    urdu: "پس تم مجھے یاد کرو میں تمہیں یاد کروں گا",
    surah: "Surah Al-Baqarah: 152"
  },
  {
    arabic: "وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ",
    urdu: "اور صبر کرو اور تمہارا صبر اللہ ہی کی توفیق سے ہے",
    surah: "Surah An-Nahl: 127"
  },
  {
    arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    urdu: "بے شک اللہ صبر کرنے والوں کے ساتھ ہے",
    surah: "Surah Al-Baqarah: 153"
  },
  {
    arabic: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ",
    urdu: "اور اللہ کی رحمت سے مایوس نہ ہو",
    surah: "Surah Yusuf: 87"
  },
  {
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي",
    urdu: "اے میرے رب میرے سینے کو کھول دے",
    surah: "Surah Ta-Ha: 25"
  },
  {
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    urdu: "اللہ ہمیں کافی ہے اور وہ بہترین کارساز ہے",
    surah: "Surah Al-Imran: 173"
  },
  {
    arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
    urdu: "اور کہو کہ اے میرے رب میرے علم میں اضافہ فرما",
    surah: "Surah Ta-Ha: 114"
  },
  {
    arabic: "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    urdu: "بے شک اللہ نیکی کرنے والوں کا اجر ضائع نہیں کرتا",
    surah: "Surah Yusuf: 90"
  },
  {
    arabic: "وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ",
    urdu: "اور اے مومنو تم سب اللہ کے حضور توبہ کرو",
    surah: "Surah An-Nur: 31"
  }
];

const namazTimes = {
  fajr: { time: '05:43', name: 'Fajr' },
  sunrise: { time: '07:04', name: 'Sunrise' },
  dhuhr: { time: '12:23', name: 'Dhuhr' },
  asr: { time: '16:07', name: 'Asr' },
  maghrib: { time: '17:43', name: 'Maghrib' },
  isha: { time: '19:04', name: 'Isha' }
};

function loadConfig() {
  try {
    config = fs.readJsonSync(configPath);
    global.config = config;
  } catch (error) {
    logs.error('CONFIG', 'Failed to load config:', error.message);
    config = {
      BOTNAME: 'RAZA BOT',
      PREFIX: '.',
      ADMINBOT: ['61582493356125'],
      TIMEZONE: 'Asia/Karachi',
      PREFIX_ENABLED: true,
      REACT_DELETE_EMOJI: '😡',
      ADMIN_ONLY_MODE: false,
      AUTO_ISLAMIC_POST: true,
      AUTO_GROUP_MESSAGE: true
    };
    global.config = config;
  }
}

function loadIslamicMessages() {
  try {
    islamicMessages = fs.readJsonSync(islamicPath);
  } catch (error) {
    logs.error('ISLAMIC', 'Failed to load islamic messages:', error.message);
    islamicMessages = { posts: [], groupMessages: [] };
  }
}

function saveConfig() {
  try {
    fs.writeJsonSync(configPath, config, { spaces: 2 });
    global.config = config;
  } catch (error) {
    logs.error('CONFIG', 'Failed to save config:', error.message);
  }
}

async function downloadImage(url, filePath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    fs.writeFileSync(filePath, Buffer.from(response.data));
    return true;
  } catch {
    return false;
  }
}

async function sendQuranAyat() {
  if (!api || !config.AUTO_ISLAMIC_POST) return;
  
  try {
    const threads = require('./Data/system/database/models/threads').getAll();
    const approvedThreads = threads.filter(t => t.approved === 1 && t.banned !== 1);
    
    if (approvedThreads.length === 0) return;
    
    const randomAyat = quranAyats[Math.floor(Math.random() * quranAyats.length)];
    const randomPic = quranPics[Math.floor(Math.random() * quranPics.length)];
    const time = moment().tz('Asia/Karachi').format('hh:mm A');
    
    const message = `
╔═══════════════════════════╗
║    📖 𝐐𝐔𝐑𝐀𝐍 𝐀𝐘𝐀𝐓    ║
╠═══════════════════════════╣

${randomAyat.arabic}

───────────────────────────
𝐔𝐫𝐝𝐮 𝐓𝐫𝐚𝐧𝐬𝐥𝐚𝐭𝐢𝐨𝐧:
${randomAyat.urdu}
───────────────────────────
📍 ${randomAyat.surah}

╚═══════════════════════════╝
🕌 ${config.BOTNAME} | ${time} PKT
    `.trim();
    
    const cacheDir = path.join(__dirname, 'raza/commands/cache');
    fs.ensureDirSync(cacheDir);
    const imgPath = path.join(cacheDir, `quran_${Date.now()}.jpg`);
    
    const downloaded = await downloadImage(randomPic, imgPath);
    
    for (const thread of approvedThreads) {
      try {
        if (downloaded && fs.existsSync(imgPath)) {
          await api.sendMessage({
            body: message,
            attachment: fs.createReadStream(imgPath)
          }, thread.id);
        } else {
          await api.sendMessage(message, thread.id);
        }
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        logs.error('QURAN_POST', `Failed to send to ${thread.id}:`, e.message);
      }
    }
    
    try { fs.unlinkSync(imgPath); } catch {}
    logs.success('QURAN_POST', `Sent Quran Ayat to ${approvedThreads.length} groups`);
  } catch (error) {
    logs.error('QURAN_POST', error.message);
  }
}

async function sendNamazAlert(namazName) {
  if (!api) return;
  
  try {
    const threads = require('./Data/system/database/models/threads').getAll();
    const approvedThreads = threads.filter(t => t.approved === 1 && t.banned !== 1);
    
    if (approvedThreads.length === 0) return;
    
    const randomPic = namazPics[Math.floor(Math.random() * namazPics.length)];
    const time = moment().tz('Asia/Karachi').format('hh:mm A');
    
    const message = `
╔═══════════════════════════╗
║   🕌 𝐍𝐀𝐌𝐀𝐙 𝐀𝐋𝐄𝐑𝐓   ║
╠═══════════════════════════╣

    ⏰ ${namazName.toUpperCase()} کا وقت ہو گیا!

    "إِنَّ الصَّلَاةَ كَانَتْ عَلَى 
    الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا"

    بے شک نماز مومنوں پر وقت 
    مقررہ پر فرض ہے۔

───────────────────────────
📍 نماز پڑھیں - جنت کی چابی
───────────────────────────

╚═══════════════════════════╝
🕌 ${config.BOTNAME} | ${time} PKT
    `.trim();
    
    const cacheDir = path.join(__dirname, 'raza/commands/cache');
    fs.ensureDirSync(cacheDir);
    const imgPath = path.join(cacheDir, `namaz_${Date.now()}.jpg`);
    
    const downloaded = await downloadImage(randomPic, imgPath);
    
    for (const thread of approvedThreads) {
      try {
        if (downloaded && fs.existsSync(imgPath)) {
          await api.sendMessage({
            body: message,
            attachment: fs.createReadStream(imgPath)
          }, thread.id);
        } else {
          await api.sendMessage(message, thread.id);
        }
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        logs.error('NAMAZ_ALERT', `Failed to send to ${thread.id}:`, e.message);
      }
    }
    
    try { fs.unlinkSync(imgPath); } catch {}
    logs.success('NAMAZ_ALERT', `Sent ${namazName} alert to ${approvedThreads.length} groups`);
  } catch (error) {
    logs.error('NAMAZ_ALERT', error.message);
  }
}

function setupSchedulers() {
  cron.schedule('0 * * * *', () => {
    logs.info('SCHEDULER', 'Hourly Quran Ayat triggered');
    sendQuranAyat();
  }, {
    timezone: 'Asia/Karachi'
  });
  
  cron.schedule('43 5 * * *', () => {
    logs.info('SCHEDULER', 'Fajr Namaz Alert');
    sendNamazAlert('Fajr');
  }, { timezone: 'Asia/Karachi' });
  
  cron.schedule('23 12 * * *', () => {
    logs.info('SCHEDULER', 'Dhuhr Namaz Alert');
    sendNamazAlert('Dhuhr');
  }, { timezone: 'Asia/Karachi' });
  
  cron.schedule('7 16 * * *', () => {
    logs.info('SCHEDULER', 'Asr Namaz Alert');
    sendNamazAlert('Asr');
  }, { timezone: 'Asia/Karachi' });
  
  cron.schedule('43 17 * * *', () => {
    logs.info('SCHEDULER', 'Maghrib Namaz Alert');
    sendNamazAlert('Maghrib');
  }, { timezone: 'Asia/Karachi' });
  
  cron.schedule('4 19 * * *', () => {
    logs.info('SCHEDULER', 'Isha Namaz Alert');
    sendNamazAlert('Isha');
  }, { timezone: 'Asia/Karachi' });
  
  logs.success('SCHEDULER', 'Quran Ayat + Namaz Alerts schedulers started');
}

async function startBot() {
  loadConfig();
  loadIslamicMessages();
  
  let appstate;
  try {
    appstate = fs.readJsonSync(appstatePath);
  } catch (error) {
    logs.error('APPSTATE', 'Failed to load appstate.json');
    logs.error('APPSTATE', 'Please provide valid appstate through the web panel');
    return;
  }
  
  logs.info('BOT', 'Starting RAZA BOT...');
  logs.info('BOT', `Timezone: ${config.TIMEZONE}`);
  logs.info('BOT', `Prefix: ${config.PREFIX}`);
  
  ws3fca.login(appstate, {
    listenEvents: true,
    selfListen: false,
    autoMarkRead: true,
    autoMarkDelivery: false,
    forceLogin: true
  }, async (err, loginApi) => {
    if (err) {
      logs.error('LOGIN', 'Failed to login:', err.message || err);
      return;
    }
    
    api = loginApi;
    global.api = api;
    global.startTime = Date.now();
    
    logs.success('LOGIN', 'Successfully logged in!');
    
    const Users = new UsersController(api);
    const Threads = new ThreadsController(api);
    const Currencies = new CurrenciesController(api);
    
    global.Users = Users;
    global.Threads = Threads;
    global.Currencies = Currencies;
    
    await loadCommands(client, commandsPath);
    await loadEvents(client, eventsPath);
    
    global.client = client;
    
    setupSchedulers();
    
    const listener = listen({
      api,
      client,
      Users,
      Threads,
      Currencies,
      config
    });
    
    api.listenMqtt(listener);
    
    const uniqueCommands = new Set();
    client.commands.forEach((cmd, key) => {
      if (cmd.config && cmd.config.name) {
        uniqueCommands.add(cmd.config.name.toLowerCase());
      }
    });
    const actualCommandCount = uniqueCommands.size;
    const actualEventCount = client.events.size;
    
    logs.success('BOT', `${config.BOTNAME} is now online!`);
    logs.info('BOT', `Commands loaded: ${actualCommandCount}`);
    logs.info('BOT', `Events loaded: ${actualEventCount}`);
    
    const adminID = config.ADMINBOT[0];
    if (adminID) {
      try {
        await api.sendMessage(`${config.BOTNAME} is now online!
─────────────────
Commands: ${actualCommandCount}
Events: ${actualEventCount}
Prefix: ${config.PREFIX}
─────────────────
Type ${config.PREFIX}help for commands`, adminID);
      } catch (e) {
        logs.warn('NOTIFY', 'Could not send startup message to admin');
      }
    }
  });
}

process.on('unhandledRejection', (reason, promise) => {
  logs.warn('UNHANDLED', 'Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
  logs.error('EXCEPTION', 'Uncaught Exception:', error.message);
});

module.exports = {
  startBot,
  getApi: () => api,
  getClient: () => client,
  getConfig: () => config,
  saveConfig,
  loadConfig,
  reloadCommands: () => loadCommands(client, commandsPath),
  reloadEvents: () => loadEvents(client, eventsPath)
};

if (require.main === module) {
  startBot();
}
