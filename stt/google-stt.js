// 📁 stt/google-stt.js
const fs = require("fs");
const speech = require("@google-cloud/speech");

const client = new speech.SpeechClient();

function setupSTT(mediaStream, onFinalTranscript) {
    const request = {
        config: {
            encoding: "MULAW",
            sampleRateHertz: 8000,
            languageCode: "lt-LT",
        },
        interimResults: false,
        singleUtterance: false
    };

    const recognizeStream = client
        .streamingRecognize(request)
        .on("error", (err) => console.error("Google STT error:", err))
        .on("data", (data) => {
            const result = data.results[0];
            if (result && result.isFinal) {
                const transcript = result.alternatives[0].transcript;
                console.log(`[Google STT Final] ${transcript}`);
                onFinalTranscript(transcript);
            }
        });

    return {
        send: (audioBuffer) => recognizeStream.write(audioBuffer),
        close: () => recognizeStream.end()
    };
}

module.exports = { setupSTT };