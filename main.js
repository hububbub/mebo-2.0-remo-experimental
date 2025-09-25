const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");

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
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ==================
// BUILT-IN HTTP SERVER (no express)
// ==================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const LOCAL_LLM_URL = "http://localhost:5000/v1/chat/completions";

// Small helper for HTTPS POST
function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Local LLM call using http
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const { hostname, port, path } = new URL(url);
    const options = {
      hostname,
      port,
      path,
      method: "POST",
      headers: { "Content-Type": "application/json" }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Minimal AI server
http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/ai") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { message, mode } = JSON.parse(body);
        let reply = "⚠️ Unknown error.";

        if (mode === "online") {
          if (!OPENAI_API_KEY) {
            reply = "❌ No OpenAI API key.";
          } else {
            const data = await httpsPost(
              {
                hostname: "api.openai.com",
                path: "/v1/chat/completions",
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${OPENAI_API_KEY}`,
                  "Content-Type": "application/json"
                }
              },
              JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: message }]
              })
            );
            reply = data.choices?.[0]?.message?.content || "⚠️ No response.";
          }
        } else if (mode === "local") {
          const data = await httpPost(
            LOCAL_LLM_URL,
            JSON.stringify({
              model: "local-llm",
              messages: [{ role: "user", content: message }]
            })
          );
          reply = data.choices?.[0]?.message?.content || "⚠️ Local AI silent.";
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: "❌ Error processing AI request." }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3030, () => {
  console.log("✅ AI server running on http://localhost:3030/ai");
});
