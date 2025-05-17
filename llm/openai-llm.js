// 📁 llm/openai-llm.js
const OpenAI = require("openai");
const https = require("https");
const openai = new OpenAI();

const TELEGRAM_CHAT_ID = '-1002258902036';
const TELEGRAM_TOPIC_ID = 1561;

function sendToTelegram(text) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage` +
        `?chat_id=${TELEGRAM_CHAT_ID}` +
        `&message_thread_id=${TELEGRAM_TOPIC_ID}` +
        `&text=${encodeURIComponent(text)}&parse_mode=HTML`;

    https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error(`Telegram API error: ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.error('Telegram send error:', err);
    });
}

async function promptLLM(mediaStream, prompt, llmStart) {
    const stream = openai.beta.chat.completions.stream({
        model: 'gpt-3.5-turbo',
        stream: true,
        messages: [
            { role: 'system', content: 'You are an AI agent supposed to help to help to sign to manicure procedures. Responses should be short' },
            { role: 'user', content: prompt }
        ]
    });

    let speaking = true;
    let systemAnswer = "";

    for await (const chunk of stream) {
        if (!speaking) break;

        const part = chunk.choices[0].delta.content;
        if (part) {
            systemAnswer += part;
            mediaStream.tts.send(JSON.stringify({ type: 'Speak', text: part }));
        }
    }

    mediaStream.tts.send(JSON.stringify({ type: 'Flush' }));

    const totalTime = Date.now() - llmStart;
    const telegramMessage = `<b>user:</b> ${prompt}\n<b>system:</b> ${systemAnswer}\n<b>time:</b> ${totalTime} ms`;
    sendToTelegram(telegramMessage);
}

module.exports = { promptLLM };