const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

module.exports.config = {
    name: "music",
    version: "6.0.0",
    permission: 0,
    prefix: true,
    premium: false,
    category: "media",
    credits: "Shaan Khan", // Aapka naam yahan update kar diya gaya hai
    description: "Fast YouTube Music Downloader",
    commandCategory: "media",
    usages: ".music [song name]",
    cooldowns: 5
};

const API_BASE = "https://yt-tt.onrender.com";

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) {
        return api.sendMessage("❌ Please provide a song name!", threadID, messageID);
    }

    // Smooth Status Update
    const statusMsg = await api.sendMessage(`✅ Apki Request Jari Hai Please wait "${query}"...`, threadID);

    try {
        const searchResults = await yts(query);
        const video = searchResults.videos[0];

        if (!video) {
            api.unsendMessage(statusMsg.messageID);
            return api.sendMessage("❌ No results found.", threadID, messageID);
        }

        const { url, title, author, timestamp } = video;

        // Smooth step transition
        await api.editMessage(`📥 Downloading: ${title}`, statusMsg.messageID, threadID);

        const response = await axios.get(`${API_BASE}/api/youtube/audio`, {
            params: { url: url },
            timeout: 60000,
            responseType: 'arraybuffer'
        });

        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);
        const audioPath = path.join(cacheDir, `${Date.now()}.mp3`);
        
        fs.writeFileSync(audioPath, Buffer.from(response.data));

        // Sending Audio and Title together (No Image)
        await api.sendMessage({
            body: `🎵 Title: ${title}\n👤 Artist: ${author.name}\n⏱️ Duration: ${timestamp}\n\n✨  »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««
          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰💞`,
            attachment: fs.createReadStream(audioPath)
        }, threadID, () => {
            // Instant Cleanup
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            api.unsendMessage(statusMsg.messageID);
        }, messageID);

    } catch (error) {
        console.error("Error:", error.message);
        api.unsendMessage(statusMsg.messageID);
        return api.sendMessage("❌ Error: Server is busy, try again!", threadID, messageID);
    }
};
