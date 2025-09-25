const { app, BrowserWindow } = require("electron");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

// Create main app window
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
}

// Electron lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// ==================
// EXPRESS SERVER FOR AI
// ==================
const server = express();
server.use(bodyParser.json());

// ENV VARS
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const LOCAL_LLM_URL = "http://localhost:5000/v1/chat/completions";

// Handle AI requests
server.post("/ai", async (req, res) => {
  const { message, mode } = req.body;

  try {
    if (mode === "online") {
      if (!OPENAI_API_KEY) {
        return res.json({ reply: "❌ No OpenAI API key found." });
      }

      // Call OpenAI Chat API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: message }]
        })
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "⚠️ No response from AI.";
      res.json({ reply });
    }

    else if (mode === "local") {
      // Call Local LLM server
      const response = await fetch(LOCAL_LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-llm",
          messages: [{ role: "user", content: message }]
        })
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "⚠️ Local AI gave no response.";
      res.json({ reply });
    }

    else {
      res.json({ reply: "❌ Unknown AI mode." });
    }
  } catch (err) {
    console.error("AI error:", err);
    res.json({ reply: "❌ Error contacting AI." });
  }
});

// Start express server on port 3030
server.listen(3030, () => {
  console.log("✅ AI server running on http://localhost:3030/ai");
});
