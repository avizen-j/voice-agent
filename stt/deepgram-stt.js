// 📁 stt/deepgram-stt.js
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);

function setupSTT(mediaStream, onFinalTranscript) {
    let is_finals = [];
    const deepgram = deepgramClient.listen.live({
        model: "nova-2-general",
        language: "en",
        smart_format: true,
        encoding: "mulaw",
        sample_rate: 8000,
        channels: 1,
        multichannel: false,
        no_delay: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000
    });

    deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("deepgram STT: Connected");

        deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript !== "") {
                if (data.is_final) {
                    is_finals.push(transcript);
                    if (data.speech_final) {
                        const utterance = is_finals.join(" ");
                        is_finals = [];
                        console.log(`[STT Final] ${utterance}`);
                        onFinalTranscript(utterance);
                    }
                }
            }
        });
    });

    return deepgram;
}

module.exports = { setupSTT };