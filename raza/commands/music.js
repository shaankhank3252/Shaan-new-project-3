const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

module.exports.config = {
    name: "music",
    version: "5.0.0",
    permission: 0,
    prefix: true,
    premium: false,
    category: "media",
    credits: "Kashif Raza",
    description: "Download music from YouTube",
    commandCategory: "media",
    usages: ".music [song name]",
    cooldowns: 5
};

const API_BASE = "https://yt-tt.onrender.com";

async function downloadAudio(videoUrl) {
    try {
        const response = await axios.get(`${API_BASE}/api/youtube/audio`, {
            params: { url: videoUrl },
            timeout: 60000,
            responseType: 'arraybuffer'
        });
        
        if (response.data) {
            return { success: true, data: response.data };
        }
        return null;
    } catch (err) {
        console.log("Audio download failed:", err.message);
        return null;
    }
}

module.exports.run = async function ({ api, event, args }) {
    const query = args.join(" ");
    
    if (!query) {
        return api.sendMessage("❌ Please provide a song name", event.threadID, event.messageID);
    }

    const frames = [
        "🩵▰▱▱▱▱▱▱▱▱▱ 10%",
        "💙▰▰▱▱▱▱▱▱▱▱ 25%",
        "💜▰▰▰▰▱▱▱▱▱▱ 45%",
        "💖▰▰▰▰▰▰▱▱▱▱ 70%",
        "💗▰▰▰▰▰▰▰▰▰▰ 100% 😍"
    ];

    const searchMsg = await api.sendMessage(`✅Apki Request Jari Hai Please Wait..: ${query}\n\n${frames[0]}`, event.threadID);

    try {
        const searchResults = await yts(query);
        const videos = searchResults.videos;
        
        if (!videos || videos.length === 0) {
            api.unsendMessage(searchMsg.messageID);
            return api.sendMessage("❌ No results found", event.threadID, event.messageID);
        }

        const firstResult = videos[0];
        const videoUrl = firstResult.url;
        const title = firstResult.title;
        const author = firstResult.author.name;
        const thumbnail = firstResult.thumbnail;

        await api.editMessage(` »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««
          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉: ${title}\n\n${frames[1]}`, searchMsg.messageID, event.threadID);
        await api.editMessage(`🎵 Downloading...\n\n${frames[2]}`, searchMsg.messageID, event.threadID);

        const downloadResult = await downloadAudio(videoUrl);
        
        if (!downloadResult || !downloadResult.success) {
            api.unsendMessage(searchMsg.messageID);
            return api.sendMessage("❌ Download server is busy. Please try again later.", event.threadID, event.messageID);
        }

        await api.editMessage(`🎵 Processing...\n\n${frames[3]}`, searchMsg.messageID, event.threadID);

        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);

        const audioPath = path.join(cacheDir, `${Date.now()}_audio.mp3`);
        fs.writeFileSync(audioPath, Buffer.from(downloadResult.data));

        await api.editMessage(`🎵 Complete!\n\n${frames[4]}`, searchMsg.messageID, event.threadID);

        let thumbPath = null;
        if (thumbnail) {
            try {
                const thumbRes = await axios.get(thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                thumbPath = path.join(cacheDir, `${Date.now()}_thumb.jpg`);
                fs.writeFileSync(thumbPath, Buffer.from(thumbRes.data));
            } catch (thumbError) {
                console.log("Thumbnail download failed:", thumbError.message);
            }
        }

        if (thumbPath && fs.existsSync(thumbPath)) {
            await api.sendMessage(
                {
                    body: ` »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««
          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 ${title}\n📺 ${author}`,
                    attachment: fs.createReadStream(thumbPath)
                },
                event.threadID
            );
        }

        await api.sendMessage(
            {
                body: `🎵 audio file`,
                attachment: fs.createReadStream(audioPath)
            },
            event.threadID
        );

        setTimeout(() => {
            try {
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                if (thumbPath && fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
                api.unsendMessage(searchMsg.messageID);
            } catch (err) {
                console.log("Cleanup error:", err);
            }
        }, 10000);

    } catch (error) {
        console.error("Music command error:", error.message);
        try { api.unsendMessage(searchMsg.messageID); } catch(e) {}
        return api.sendMessage("❌ An error occurred. Please try again.", event.threadID, event.messageID);
    }
};
