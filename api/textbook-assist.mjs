/**
 * Vercel Serverless Function: POST /api/textbook-assist
 *
 * 为 Leon Greek Coach 三大攻坚区块 & 三年级语言强制闯关提供基于原书真页的 Gemini 智能辅导：
 *   - mode = "word"             : 结合课本原句点词精讲（返回标准词典原形 lemma + 精准中文 + 词形与用法讲解）
 *   - mode = "preview_guide"    : 预习启发指南（30秒导读 + 建议抄在纸质书上的关键词 + 启发思考点 + 大意核对要点）
 *   - mode = "review_coach"     : 复习重点提炼 + 3 道紧扣本页课文/练习册的随堂小测题（含逐题详解）
 *   - mode = "explain_exercise" : 练习册/课本题目逐题翻译题干与解题思路讲解（严禁直接给全题现成答案）
 */

const SCHEMAS = {
  word: {
    type: 'OBJECT',
    properties: {
      lemma: { type: 'STRING' },
      chinese: { type: 'STRING' },
      formNote: { type: 'STRING' },
      usageTip: { type: 'STRING' },
    },
    required: ['lemma', 'chinese', 'formNote', 'usageTip'],
  },
  preview_guide: {
    type: 'OBJECT',
    properties: {
      storyHook: { type: 'STRING' },
      writeOnBookWords: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            word: { type: 'STRING' },
            lemma: { type: 'STRING' },
            chinese: { type: 'STRING' },
            why: { type: 'STRING' },
          },
          required: ['word', 'lemma', 'chinese', 'why'],
        },
      },
      thinkPrompts: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
      keyPointsForCheck: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
    },
    required: ['storyHook', 'writeOnBookWords', 'thinkPrompts', 'keyPointsForCheck'],
  },
  review_coach: {
    type: 'OBJECT',
    properties: {
      corePoints: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            detail: { type: 'STRING' },
          },
          required: ['title', 'detail'],
        },
      },
      quiz: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: { type: 'ARRAY', items: { type: 'STRING' } },
            answerIndex: { type: 'INTEGER' },
            explanation: { type: 'STRING' },
          },
          required: ['question', 'options', 'answerIndex', 'explanation'],
        },
      },
    },
    required: ['corePoints', 'quiz'],
  },
  explain_exercise: {
    type: 'OBJECT',
    properties: {
      items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            instructionZh: { type: 'STRING' },
            grammarFocus: { type: 'STRING' },
            howToSolve: { type: 'STRING' },
            exampleHint: { type: 'STRING' },
          },
          required: ['title', 'instructionZh', 'grammarFocus', 'howToSolve', 'exampleHint'],
        },
      },
    },
    required: ['items'],
  },
};

function sanitizeCleanChinese(raw) {
  return String(raw || '')
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|【[^】]*】/g, '')
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 36);
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

function buildPrompt(mode, payload) {
  const bookTitle = String(payload?.bookTitle || '希腊小学课本').slice(0, 100);
  const pageRange = String(payload?.pageRange || '').slice(0, 40);

  if (mode === 'word') {
    const word = String(payload?.word || '').trim().slice(0, 80);
    const sentence = String(payload?.sentence || '').trim().slice(0, 500);
    const sys = `你是希腊公立小学四年级 11 岁华裔男生 Leon 的专属课本精讲老师。
请结合课本原句解释学生点选的词，直接从希腊语（或英语课本中的英文/希腊文）译为自然准确的简体中文，绝不经英文生硬中转。
规则：
1. lemma：给出适合收入背词题库的标准词典原形（希腊语动词给第一人称单数现在时如 τρέχω；希腊语名词给单数主格如 θάλασσα，不带括号；形容词给阳性单数主格；固定副词/连词保持原形；若点选的是英文词则给英文原形）。
2. chinese：在当前句子里最准确的简体中文词义，简洁 2–6 个汉字，严禁带希腊字母、英文字母或括号（该字段将直接作为刷题标准答案）。
3. formNote：用一句小学生秒懂的大白话说明课本里这个词是什么变形（如「课本里写的是 έτρεχαν，是动词 τρέχω 的过去持续时“他们当时在跑”」；若本身就是原形则简述词性）。
4. usageTip：用 1–2 句轻松亲切的话讲讲常见搭配或记忆小窍门，并举 1 个极短双语小例子。`;
    const user = `教材：${bookTitle}（${pageRange}）\n学生点选的词：${word}\n所在课本原句：${sentence}`;
    return { sys, user };
  }

  if (mode === 'preview_guide') {
    const pageText = String(payload?.pageText || '').slice(0, 7500);
    const sys = `你是希腊小学 11 岁华裔学生 Leon 的课前预习教练。目标：帮他不发怵地读懂新课，并启发他亲手用铅笔把关键信息标在纸质课本上！
请严格基于提供的课本原文输出：
1. storyHook：用 2–3 句生动大白话做「30 秒预习导读」，告诉他这几页大概讲什么故事或主题、有什么有意思的地方。
2. writeOnBookWords：挑出本页最关键、最值得他用铅笔在纸质书上圈出来标中文的 5–7 个生词或短语（word=书上原词，lemma=标准词典原形，chinese=简洁纯中文释义不含括号和外文，why=一句简短提示为什么重要或是什么词形）。
3. thinkPrompts：给出 2 条「边读边往书上做记号的启发提示」（例如提示他在某段找某种时态变化、或在某句旁思考一个问题准备明天听老师讲）。
4. keyPointsForCheck：总结 3 条本页真实核心内容要点（简明扼要，供孩子合上书说完中文大意后自己对照，也供家长在日报里核查）。`;
    const user = `教材：${bookTitle}（${pageRange}）\n课本原文：\n${pageText}`;
    return { sys, user };
  }

  if (mode === 'review_coach') {
    const pageText = String(payload?.pageText || '').slice(0, 6500);
    const workbookText = String(payload?.workbookText || '').slice(0, 3500);
    const sys = `你是希腊小学 11 岁华裔学生 Leon 的课后复习与闯关教练。
请严格基于提供的课本原文（及配套练习册原文）输出：
1. corePoints：提炼 2–3 条「本课必会核心重点」（涵盖本页核心语法变形规律、重点句型或关键概念，用小学生一看就懂的中文讲透，并带上原文例词）。
2. quiz：出 3 道高质量四选一随堂闯关题（options 固定 4 个选项，answerIndex 为 0–3 的正确下标，explanation 用中文详细讲清为什么选这个、其它选项错在哪）：
   - 题目必须紧扣这几页的真实课文理解、本课语法词形变化或配套练习册里的真实考点；
   - 题干用清晰中文（镶嵌要考的希腊语/英语原词或句子），难度贴合小学三/四年级实战。`;
    const user = `教材：${bookTitle}（${pageRange}）\n【课本内容】：\n${pageText}\n${workbookText ? `\n【配套练习册内容】：\n${workbookText}` : ''}`;
    return { sys, user };
  }

  // explain_exercise
  const exerciseText = String(payload?.exerciseText || '').slice(0, 7500);
  const sys = `你是希腊小学 11 岁华裔学生 Leon 的练习册讲题老师。
学生常常因为看不懂希腊语写的题目要求（题干指令）而卡壳。请识别本页中的每一道练习题（最多前 6 道），逐题讲解：
1. title：标明题号（如「第 1 题」或原书题号）。
2. instructionZh：把原题干要求完整、直白地翻译成中文，明确告诉孩子这道题到底要他做什么（顺手点出题干里的关键希腊语指令词意思，如 υπογραμμίζω=划线、συμπληρώνω=填空）。
3. grammarFocus：点明这道题考查的核心语法或词汇知识点。
4. howToSolve：分两步教他怎么动脑思考、怎么变词尾。
5. exampleHint：【严守红线】只用第 1 个小空或自造的同类词举 1 个示范例子，绝对禁止把整道题所有空的最终标准答案直接全部写出来，必须留给孩子自己动笔做在纸质练习册上！`;
  const user = `练习册/课本：${bookTitle}（${pageRange}）\n本页题目原文：\n${exerciseText}`;
  return { sys, user };
}

async function callGemini(apiKey, model, mode, payload) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const { sys, user } = buildPrompt(mode, payload);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: SCHEMAS[mode],
        ...(model.startsWith('gemini-3.')
          ? { thinkingConfig: { thinkingLevel: 'low' } }
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
  return JSON.parse(text);
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
      error: '尚未配置 GEMINI_API_KEY 环境变量。',
      code: 'MISSING_API_KEY',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: '请求体不是合法的 JSON' });
  }

  const mode = String(body?.mode || '');
  if (!SCHEMAS[mode]) {
    return sendJson(res, 400, { error: `不支持的辅导模式: ${mode}` });
  }

  const modelsToTry = Array.from(
    new Set(
      (mode === 'word'
        ? [
            process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
            'gemini-3.8-flash',
            'gemini-3.6-flash',
            'gemini-flash-latest',
          ]
        : [
            process.env.GEMINI_MODEL || 'gemini-3.8-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-flash-latest',
          ]
      ).filter(Boolean)
    )
  );

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const result = await callGemini(apiKey, model, mode, body);
      if (mode === 'word' && result) {
        result.chinese = sanitizeCleanChinese(result.chinese) || result.chinese;
      }
      if (mode === 'preview_guide' && Array.isArray(result?.writeOnBookWords)) {
        result.writeOnBookWords = result.writeOnBookWords.map((w) => ({
          ...w,
          chinese: sanitizeCleanChinese(w.chinese) || w.chinese,
        }));
      }
      return sendJson(res, 200, { ok: true, mode, model, data: result });
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
    error: `课本智能助教暂时繁忙（${lastErr?.message || '未知错误'}），请重试一下。`,
    code: 'UPSTREAM_ERROR',
  });
}
