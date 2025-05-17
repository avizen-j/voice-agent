// 📁 tts/deepgram-tts.js
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const outputPath = path.join(__dirname, '../output.raw');
const writeStream = fs.createWriteStream(outputPath, { flags: 'a' });

const deepgramTTSWebsocketURL = 'wss://api.deepgram.com/v1/speak?encoding=mulaw&sample_rate=8000&container=none';

function setupTTS(mediaStream) {
    const options = {
        headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
        }
    };
    const ws = new WebSocket(deepgramTTSWebsocketURL, options);

    ws.on('open', () => console.log('deepgram TTS: Connected'));

    ws.on('message', (data) => {
        try {
            let json = JSON.parse(data.toString());
            console.log('deepgram TTS: JSON', json);
            return;
        } catch {}

        writeStream.write(data);
        const payload = data.toString('base64');
        const message = {
            event: 'media',
            streamSid: mediaStream.streamSid,
            media: { payload }
        };
        mediaStream.connection.sendUTF(JSON.stringify(message));
    });

    ws.on('close', () => {
        console.log('deepgram TTS: Closed');
        writeStream.end();
    });

    ws.on('error', (err) => console.error('deepgram TTS error:', err));

    return ws;
}

module.exports = { setupTTS };