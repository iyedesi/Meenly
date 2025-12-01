const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ------------------- DEBUG -------------------
console.log("🔄 Démarrage de server.js...");
console.log("DEBUG OPENAI_API_KEY définie ? =>", !!process.env.OPENAI_API_KEY);
// ---------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// Servir les fichiers de /public
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// On ne stoppe plus le serveur si la clé manque
if (!OPENAI_API_KEY) {
  console.error("⚠️  ATTENTION : OPENAI_API_KEY manquante dans .env");
  console.error("⚠️  Les appels à OpenAI échoueront.");
}

// Fonction pour appeler OpenAI
async function callOpenAIChat(payload) {
  if (!OPENAI_API_KEY) throw new Error("Clé OpenAI absente");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + OPENAI_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Erreur OpenAI:", text);
    throw new Error("Réponse OpenAI non valide");
  }

  return response.json();
}

// ---------------- ROUTE CHAT ----------------
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, temperature } = req.body;

    const data = await callOpenAIChat({
      model: "gpt-4o-mini",
      messages,
      temperature: temperature ?? 0.75,
    });

    res.json(data);
  } catch (err) {
    console.error("Erreur /api/chat:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --------------- ROUTE GUARDRail ----------------
app.post("/api/guardrail", async (req, res) => {
  try {
    const { text } = req.body;

    const data = await callOpenAIChat({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Tu es un détecteur. Réponds uniquement par 'OK' si le message parle d’émotions, tristesse, colère, anxiété, solitude, stress, fatigue mentale, confiance en soi, relations. Sinon réponds 'HORS SUJET'.",
        },
        { role: "user", content: text },
      ],
    });

    const result = data.choices?.[0]?.message?.content?.trim() ?? "HORS SUJET";
    res.json({ result });
  } catch (err) {
    console.error("Erreur guardrail:", err.message);
    res.status(500).json({ error: "Erreur serveur guardrail" });
  }
});

// ------------------ DÉMARRAGE ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur Meenly lancé sur : http://localhost:${PORT}`);
});
