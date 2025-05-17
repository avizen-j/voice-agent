// 📁 server.js
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const { setupSTT } = require("./stt/deepgram-stt");
const { setupTTS } = require("./tts/deepgram-tts");
const { promptLLM } = require("./llm/openai-llm");

const HttpDispatcher = require("httpdispatcher");
const WebSocketServer = require("websocket").server;

const dispatcher = new HttpDispatcher();
const wsserver = http.createServer(handleRequest);
const HTTP_SERVER_PORT = 8080;
const mediaws = new WebSocketServer({
    httpServer: wsserver,
    autoAcceptConnections: true,
});

function handleRequest(request, response) {
    try {
        dispatcher.dispatch(request, response);
    } catch (err) {
        console.error(err);
    }
}

// Twilio XML route
const templatesPath = path.join(__dirname, "templates", "streams.xml");
dispatcher.onPost("/twiml", (req, res) => {
    const stat = fs.statSync(templatesPath);
    res.writeHead(200, { "Content-Type": "text/xml", "Content-Length": stat.size });
    fs.createReadStream(templatesPath).pipe(res);
});

dispatcher.onGet("/", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World!');
});

mediaws.on("connect", (connection) => {
    console.log("twilio: Connection accepted");
    new MediaStream(connection);
});

class MediaStream {
    constructor(connection) {
        this.connection = connection;
        this.streamSid = '';
        this.tts = setupTTS(this);
        this.stt = setupSTT(this, async(userText) => {
            const llmStart = Date.now();
            await promptLLM(this, userText, llmStart);
        });

        connection.on("message", this.processMessage.bind(this));
        connection.on("close", this.close.bind(this));
        this.hasSeenMedia = false;
    }

    processMessage(message) {
        if (message.type !== "utf8") return;
        const data = JSON.parse(message.utf8Data);

        if (data.event === "start") {
            console.log("twilio: Start", data);
            this.streamSid = data.streamSid;
        } else if (data.event === "media") {
            if (!this.hasSeenMedia) {
                console.log("twilio: Media received");
                this.hasSeenMedia = true;
            }
            const rawAudio = Buffer.from(data.media.payload, 'base64');
            this.stt.send(rawAudio);
        } else if (data.event === "close") {
            this.close();
        }
    }

    close() {
        console.log("twilio: Closed");
    }
}

wsserver.listen(HTTP_SERVER_PORT, () => {
    console.log("Server listening on: http://localhost:%s", HTTP_SERVER_PORT);
});