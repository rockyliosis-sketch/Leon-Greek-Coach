/**
 * Vercel Serverless Function / Service: POST /api/translate
 *
 * 将孩子用 iPad 语音录入的希腊语生词批量翻译成准确、简洁的简体中文释义（供 Leon Greek Coach 录词框一键填中文使用）。
 * 密钥仅存放在 Vercel 后台环境变量 GEMINI_API_KEY（大小写不敏感）中，绝不暴露给前端或 GitHub 公开仓库。
 */

const MAX_WORDS_PER_BATCH = 40;
const MAX_WORD_LEN = 120;

const SYSTEM_INSTRUCTION = `你是服务于希腊公立小学四年级华裔学生的现代希腊语—简体中文词典专家。
学生会用 iPad 语音输入课本或阅读中遇到的希腊语生词（常为变位动词、变格名词、复数或首字母大写的孤立词）。

请严格遵守以下规则：
1. 直接从现代希腊语翻译为简体中文，严禁经英语中转导致多义词错译（例如：Δάκρυ 是「眼泪」绝不是「撕裂」，Παρών 是「在场的 / 到场」绝不是「展示」，Διηγηθείτε 是「讲述 / 讲故事」绝不是「已过滤」，Θυμηθείτε 是「记住 / 回想」绝不是「嫉妒」）。
2. 自动识别希腊语变位、变格、时态和语态，给出该词在小学课本语境下最准确、自然的简体中文词义：
   - 简洁明了，2–8 个汉字为主；有 2 个常见义项时用「 / 」隔开（如「讲述 / 讲故事」「如今 / 已经」）；
   - 中文释义中严禁包含希腊字母、英文字母、拼音或括号说明。
3. 语音拼写纠偏（correctedGreek）：
   - 仅当输入明显存在 iPad 语音识别漏字/错拼（如「λιακούς θερμοσίφωνες」漏了首字母应为「ηλιακούς θερμοσίφωνες」）时，才在 correctedGreek 中给出修正后的正确希腊语；
   - 若输入本身是合法的希腊语单词或正常变位/变格形式（哪怕首字母大写），correctedGreek 直接原样返回输入词，不要强行改动词形。
4. 严格按输入的 index 顺序逐条返回 JSON 数组，不得遗漏或合并条目。`;

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      index: { type: 'INTEGER' },
      chinese: { type: 'STRING' },
      correctedGreek: { type: 'STRING' },
    },
    required: ['index', 'chinese', 'correctedGreek'],
  },
};

function sanitizeChinese(raw) {
  return String(raw || '')
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|【[^】]*】/g, '')
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

async function callGeminiModel(apiKey, model, words) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const numbered = words.map((w, idx) => `${idx}: ${w}`).join('\n');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `请翻译以下 ${words.length} 个希腊语词条并按 JSON 数组返回：\n${numbered}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: Math.min(2048, Math.max(300, words.length * 60)),
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        ...(model.startsWith('gemini-3.')
          ? {
              thinkingConfig: {
                thinkingLevel: model.includes('flash-lite') ? 'minimal' : 'low',
              },
            }
          : {}),
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini ${model} returned empty content`);
  }
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error(`Gemini ${model} returned non-array JSON`);
  }
  const meta = data?.usageMetadata || {};
  const promptTokens = Number(meta.promptTokenCount) || 0;
  const outputTokens = (Number(meta.candidatesTokenCount) || 0) + (Number(meta.thoughtsTokenCount) || 0);
  const totalTokens = Number(meta.totalTokenCount) || promptTokens + outputTokens;
  return { items: parsed, usage: { promptTokens, outputTokens, totalTokens } };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: '仅支持 POST 请求' });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.Gemini_Api_Key ||
    Object.entries(process.env).find(([k]) => k.toLowerCase() === 'gemini_api_key')?.[1];
  if (!apiKey) {
    return sendJson(res, 503, {
      error: '尚未在 Vercel 后台配置 GEMINI_API_KEY 环境变量，请配置并重新部署后再试。',
      code: 'MISSING_API_KEY',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: '请求体不是合法的 JSON' });
  }

  const rawWords = Array.isArray(body?.words) ? body.words : [];
  const words = rawWords
    .map((w) => String(w || '').trim().slice(0, MAX_WORD_LEN))
    .filter(Boolean)
    .slice(0, MAX_WORDS_PER_BATCH);

  if (words.length === 0) {
    return sendJson(res, 400, { error: '请先输入至少 1 个希腊语单词' });
  }

  const modelsToTry = Array.from(
    new Set([
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ].filter(Boolean))
  );

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const { items, usage } = await callGeminiModel(apiKey, model, words);
      const byIndex = new Map();
      for (const it of items) {
        const idx = Number(it?.index);
        if (Number.isInteger(idx) && idx >= 0 && idx < words.length) {
          byIndex.set(idx, it);
        }
      }

      const results = words.map((input, idx) => {
        const hit = byIndex.get(idx);
        const chinese = sanitizeChinese(hit?.chinese || '');
        const correctedRaw = String(hit?.correctedGreek || '').trim();
        const correctedGreek =
          correctedRaw && /[\u0370-\u03FF\u1F00-\u1FFF]/.test(correctedRaw)
            ? correctedRaw
            : input;
        return { index: idx, input, chinese, correctedGreek };
      });

      return sendJson(res, 200, { results, model, usage });
    } catch (err) {
      lastErr = err;
      if (err?.status === 401 || err?.status === 403) {
        return sendJson(res, 502, {
          error: 'Gemini API Key 无效或无权限，请检查 Vercel 环境变量 GEMINI_API_KEY。',
          code: 'INVALID_API_KEY',
        });
      }
    }
  }

  return sendJson(res, 502, {
    error: `智能翻译服务暂时不可用（${lastErr?.message || '未知错误'}），请稍后再试。`,
    code: 'UPSTREAM_ERROR',
  });
}
