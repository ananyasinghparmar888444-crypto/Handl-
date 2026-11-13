import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.get('/api/maps-config', (_req, res) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';
  res.json({ apiKey });
});

app.post('/api/analyze-problem', async (req, res) => {
  try {
    const {
      text = '',
      imageBase64,
      imageMimeType,
      audioBase64,
      audioMimeType,
    } = req.body as {
      text?: string;
      imageBase64?: string;
      imageMimeType?: string;
      audioBase64?: string;
      audioMimeType?: string;
    };

    if (!text.trim() && !imageBase64 && !audioBase64) {
      res.status(400).json({
        error: 'Please describe the problem, record voice audio, or upload a photo.',
      });
      return;
    }

    const ai = getAiClient();
    let combinedText = text.trim();

    if (audioBase64) {
      const transcribeResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: audioMimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this customer voice message about a home repair issue or scrap items to sell. Output clean plain text in English (translating Hindi/Hinglish phrases clearly while preserving item names).',
            },
          ],
        },
      });
      const transcriptText = (transcribeResp.text ?? '').trim();
      if (transcriptText) {
        combinedText = combinedText
          ? `${combinedText}\nVoice note: ${transcriptText}`
          : transcriptText;
      }
    }

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: imageBase64,
        },
      });
    }

    const prompt = `Analyze this household service or scrap pickup request from Kanpur, India.
Customer description: "${combinedText || 'See attached photo.'}"

Determine:
1. workerType: exactly one of "plumber", "electrician", "carpenter", "kabadiwala".
   - Use "kabadiwala" for scrap, old newspapers, cardboard, metal, e-waste, broken appliances for sale/recycling, bottles, or junk removal.
   - Use "plumber" for leaks, taps, pipes, drainage, bathroom/kitchen fittings, water tanks.
   - Use "electrician" for wiring, MCB, switches, fans, AC points, short circuits, inverter, appliances.
   - Use "carpenter" for doors, locks, hinges, furniture, wood repair, shelves, windows.
2. urgency: one of "Low", "Medium", "High", "Emergency".
3. Fair price range in Indian Rupees (INR) realistic for Kanpur local market rates (priceMinInr, priceMaxInr). For kabadiwala scrap pickups, this is the estimated payout value range the household receives in INR.
4. summary: 1-2 crisp sentences describing the diagnosed problem or scrap batch.
5. recommendedAction: 1 short sentence explaining what the assigned worker will bring or do.
6. isScrap: true if workerType is "kabadiwala" or the photo shows scrap items to sell/recycle; otherwise false.
7. scrapItems: If isScrap is true, break down every visible or mentioned scrap item with quantityOrWeight (e.g. "~6 kg", "2 units"), ratePerUnitInr (Kanpur scrap rate in INR), and estimatedValueInr. If not scrap, return an empty array [].`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are an expert home-services dispatcher and Kanpur scrap valuation specialist for Handl. Always respond strictly in valid JSON matching the schema. Be concise, accurate, and grounded in realistic Kanpur INR pricing.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workerType: {
              type: Type.STRING,
              description:
                'Must be one of: plumber, electrician, carpenter, kabadiwala',
            },
            urgency: {
              type: Type.STRING,
              description: 'Must be one of: Low, Medium, High, Emergency',
            },
            priceMinInr: {
              type: Type.INTEGER,
              description: 'Lower bound of fair price/payout range in INR',
            },
            priceMaxInr: {
              type: Type.INTEGER,
              description: 'Upper bound of fair price/payout range in INR',
            },
            summary: {
              type: Type.STRING,
              description: 'Concise 1-2 sentence diagnosis or scrap overview',
            },
            recommendedAction: {
              type: Type.STRING,
              description: 'Short recommended next step for the worker',
            },
            isScrap: {
              type: Type.BOOLEAN,
              description: 'Whether this is a scrap/kabadiwala request',
            },
            scrapItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  quantityOrWeight: { type: Type.STRING },
                  ratePerUnitInr: { type: Type.INTEGER },
                  estimatedValueInr: { type: Type.INTEGER },
                },
                required: [
                  'item',
                  'quantityOrWeight',
                  'ratePerUnitInr',
                  'estimatedValueInr',
                ],
              },
            },
          },
          required: [
            'workerType',
            'urgency',
            'priceMinInr',
            'priceMaxInr',
            'summary',
            'recommendedAction',
            'isScrap',
            'scrapItems',
          ],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);

    const allowedTrades = new Set([
      'plumber',
      'electrician',
      'carpenter',
      'kabadiwala',
    ]);
    const workerType = allowedTrades.has(parsed.workerType)
      ? parsed.workerType
      : 'plumber';

    const allowedUrgency = new Set(['Low', 'Medium', 'High', 'Emergency']);
    const urgency = allowedUrgency.has(parsed.urgency)
      ? parsed.urgency
      : 'Medium';

    res.json({
      transcript: combinedText,
      workerType,
      urgency,
      priceMinInr: Math.max(0, Math.round(Number(parsed.priceMinInr) || 200)),
      priceMaxInr: Math.max(
        Math.round(Number(parsed.priceMinInr) || 200),
        Math.round(Number(parsed.priceMaxInr) || 450)
      ),
      summary: parsed.summary || 'Assessment complete.',
      recommendedAction:
        parsed.recommendedAction || 'Specialist will inspect on arrival.',
      isScrap: Boolean(parsed.isScrap || workerType === 'kabadiwala'),
      scrapItems: Array.isArray(parsed.scrapItems) ? parsed.scrapItems : [],
    });
  } catch (err: unknown) {
    console.error('Gemini analyze-problem error:', err);
    const message =
      err instanceof Error ? err.message : 'Unable to analyze request right now.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Handl server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
