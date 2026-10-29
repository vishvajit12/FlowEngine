const { UnrecoverableError } = require('bullmq');
const IAIProviderAdapter = require('./IAIProviderAdapter');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MODEL_MAP = {
  'Gemini 3.6 Flash': GEMINI_MODEL,
  'gemini-3.6-flash': GEMINI_MODEL,
  'Gemini 2.5 Pro': GEMINI_MODEL,
  'gemini-2.5-pro': GEMINI_MODEL,
};
const DEFAULT_MODEL = GEMINI_MODEL;

// Optional second model (separate quota) to try if the first is exhausted or overloaded.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class GeminiAdapter extends IAIProviderAdapter {
  constructor(apiKey) {
    super();
    if (!apiKey) throw new Error('GeminiAdapter requires an API key');
    this.apiKey = apiKey;
  }

  _call(modelId, prompt, temperature) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: Number(temperature) },
      }),
    });
  }

  async generate(prompt, { model = DEFAULT_MODEL, temperature = 0.5 } = {}) {
    const primary = MODEL_MAP[model] || DEFAULT_MODEL;
    const candidates = [primary];
    if (FALLBACK_MODEL && FALLBACK_MODEL !== primary) candidates.push(FALLBACK_MODEL);

    let lastError;
    let allDailyQuota = true; // stays true only if EVERY candidate hit its daily cap

    for (const modelId of candidates) {
      let dailyQuota = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await this._call(modelId, prompt, temperature);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text === undefined) {
            throw new Error(`Gemini API returned no usable text. Full response: ${JSON.stringify(data)}`);
          }
          return text;
        }

        const errBody = await res.text();
        lastError = new Error(`Gemini API error (${res.status}): ${errBody}`);

        if (res.status === 429 && /PerDay/i.test(errBody)) {
          dailyQuota = true; // waiting seconds can't fix a daily cap: skip to the next model
          break;
        }
        allDailyQuota = false;
        if (res.status !== 503) throw lastError; // anything but "overloaded": don't hammer the API
        await sleep(attempt * 3000); // 3s, 6s, 9s
      }

      if (!dailyQuota) allDailyQuota = false;
    }

    // Every model is out of daily quota: tell BullMQ not to retry (each retry would just waste requests).
    if (allDailyQuota) throw new UnrecoverableError(lastError.message);
    throw lastError;
  }
}

module.exports = GeminiAdapter;