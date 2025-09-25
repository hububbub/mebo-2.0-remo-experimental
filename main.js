// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");

let mainWindow;
let aiProvider = "cloud"; // default: cloud
let localApiUrl = "http://localhost:5000/v1/chat/completions";

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");
});

// --- AI Settings IPC ---
ipcMain.on("set-ai-provider", (event, provider) => {
  aiProvider = provider;
  console.log("AI provider switched to:", provider);
});

ipcMain.on("set-local-api-url", (event, url) => {
  localApiUrl = url;
  console.log("Local API URL set to:", url);
});

// --- Camera frame analysis ---
ipcMain.handle("analyze-frame", async (event, frameBase64) => {
  try {
    let response, text;

    if (aiProvider === "cloud") {
      // OpenAI Vision API
      response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are Mebo's vision system. 
                Respond ONLY in strict JSON:
                { "say": "...", "action": "...", "duration": number }`
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this camera frame." },
                { type: "image_url", image_url: { url: frameBase64 } }
              ]
            }
          ],
          temperature: 0.2
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        }
      );
      text = response.data.choices[0].message.content;

    } else {
      // Local API (e.g., LM Studio, LLaVA)
      response = await axios.post(localApiUrl, {
        model: "llava",
        messages: [
          { role: "system", content: "Return only JSON {say, action, duration}" },
          { role: "user", content: "Analyze this camera frame." }
        ],
        images: [frameBase64]
      });
      text = response.data.choices[0].message.content;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { say: text, action: null, duration: 0 };
    }
    return parsed;

  } catch (err) {
    console.error("AI error:", err.message);
    return { say: "AI error: " + err.message, action: null, duration: 0 };
  }
});
