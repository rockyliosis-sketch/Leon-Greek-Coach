# Leon Greek Coach · 首页通关工作台 UI 配图生成规范与提示词清单（供 Codex 批量生图）

> **使用方式**：将本文件直接交给 Codex 批量生成以下 5 张专属插画图标，全部输出为 **无边框、高质量 PNG** 并直接放入 **`frontend/public/images/ui/`** 目录。
> 前端代码（`DailyMissionHall.tsx`）已在对应卡片中预埋好加载位（`<OptionalMascot />`），图片放入目录并推送后**无需修改任何代码即可自动美观显示**。

---

## 一、 全局统一视觉风格规范（必须严格保持一致）

- **主角设定**：11 岁阳光帅气的中国男孩 Leon（圆润温和的少年感、黑短发、佩戴轻便小探险家/雅典学院风蓝白领巾或卫衣），与现有 `leon_avatar.png` 及三四年级历史绘本的暖金 + 爱琴海蓝水彩插画体系自然融合。
- **画风**：精致现代儿童绘本水彩 + 柔和数字厚涂（Warm Storybook Gouache & Soft Digital Illustration），线条干净、色彩通透、构图居中饱满、留白舒适，绝不出现杂乱文字、水印、相框或多余边框。
- **背景**：柔和淡雅的纯色或微渐变马卡龙浅底（与对应卡片主题色呼应），方便圆角裁切嵌入网页卡片。
- **尺寸与格式**：全部为 **`512 × 512 px`（1:1 正方形）PNG**，主体人物与核心道具占画面中央 `75%–80%`，四角不裁切人物头部或关键道具。

---

## 二、 待生成图片清单（共 5 张）

### 1. 每日网站刷题训练卡片图标
- **输出路径**：`frontend/public/images/ui/card_practice.png`
- **尺寸格式**：`512 × 512 px` PNG（1:1）
- **色调匹配**：清新爱琴海蓝 + 柔和浅天蓝背景（`#eff6ff`）
- **画面描述**：11 岁中国男孩 Leon 自信微笑着，手里拿着一支发光的蓝色魔法手写笔在悬浮的平板上拼写希腊字母（不需要可读具体单词，仅用简洁星光符号暗示），身旁漂浮着一颗金色小星星和闪电能量图标。
- **Prompt (EN)**：
  > Warm modern storybook gouache illustration of a cheerful 11-year-old Chinese boy (short black hair, wearing a crisp blue-and-white Mediterranean hoodie) holding a glowing blue stylus over a floating sleek tablet with tiny golden sparkles and stars around it, symbolizing fun gamified language practice. Centered square icon composition, soft sky-blue pastel background (#eff6ff), clean lines, vibrant warm lighting, no text, no letters, no border, no watermark, 512x512.

---

### 2. 希腊历史故事馆卡片图标
- **输出路径**：`frontend/public/images/ui/card_history.png`
- **尺寸格式**：`512 × 512 px` PNG（1:1）
- **色调匹配**：雅典橄榄绿 + 暖金羊皮纸色背景（`#edf5f0`）
- **画面描述**：11 岁中国男孩 Leon 戴着复古暖金色大耳机，抱着一本打开的发光古希腊神话绘本，书页上方轻轻浮现出微缩的帕特农神庙剪影与一艘金色小帆船。
- **Prompt (EN)**：
  > Warm modern storybook gouache illustration of an 11-year-old Chinese boy wearing cozy warm-gold headphones, happily holding an open glowing ancient Greek storybook from which a tiny golden Parthenon silhouette and a miniature ancient Greek sailboat gently float out. Centered square icon composition, soft sage-mint pastel background (#edf5f0), warm golden rim light, clean lines, no text, no border, no watermark, 512x512.

---

### 3. 区块一「学校复习 + 生词入库 + 作业」小人图标
- **输出路径**：`frontend/public/images/ui/mascot_school.png`
- **尺寸格式**：`512 × 512 px` PNG（1:1）
- **色调匹配**：清爽薄荷青绿背景（`#f0fdfa`）
- **画面描述**：11 岁中国男孩 Leon 坐在整洁书桌前，一手握着黄色铅笔在课本上做记号，另一手拿着小放大镜开心发现宝藏般的表情，旁边有一个绿色对勾小徽章。
- **Prompt (EN)**：
  > Warm modern storybook gouache illustration of a focused, smiling 11-year-old Chinese boy at a tidy desk, holding a bright yellow pencil in one hand and a cute magnifying glass in the other while exploring an open school textbook, with a small fresh green checkmark sparkle nearby. Centered square icon composition, soft mint-teal pastel background (#f0fdfa), crisp warm lighting, no text, no letters, no border, no watermark, 512x512.

---

### 4. 区块二「网站刷题 + 希腊语私教课」小人图标
- **输出路径**：`frontend/public/images/ui/mascot_practice_tutor.png`
- **尺寸格式**：`512 × 512 px` PNG（1:1）
- **色调匹配**：清新天蓝 + 暖橙点缀背景（`#eff6ff`）
- **画面描述**：11 岁中国男孩 Leon 戴着轻便耳麦，面前摆着一本翻开的蓝色语言教材和一支铅笔，头顶亮起一颗灵感小灯泡，旁边漂浮一个可爱的蓝色小火箭象征提速冲刺。
- **Prompt (EN)**：
  > Warm modern storybook gouache illustration of an enthusiastic 11-year-old Chinese boy wearing a lightweight headset, leaning over a blue language textbook with a yellow pencil and a bright golden lightbulb idea glowing above, accompanied by a tiny playful blue rocket symbolizing fast progress. Centered square icon composition, soft pastel blue background (#eff6ff), clean lines, joyful expression, no text, no border, no watermark, 512x512.

---

### 5. 区块三「学校下节课多科预习」小人图标
- **输出路径**：`frontend/public/images/ui/mascot_preview.png`
- **尺寸格式**：`512 × 512 px` PNG（1:1）
- **色调匹配**：梦幻薰衣草浅紫背景（`#f5f3ff`）
- **画面描述**：11 岁中国男孩 Leon 化身小小领航探险家，举着一只精致的金色小望远镜向前方眺望，身旁叠着两本彩色课本，周围点缀几颗闪亮的星光，象征提前抢跑预习。
- **Prompt (EN)**：
  > Warm modern storybook gouache illustration of a curious 11-year-old Chinese boy as a young explorer looking ahead through a cute golden spyglass telescope, with two colorful stacked school textbooks beside him and gentle glowing stars around, symbolizing previewing and getting ahead. Centered square icon composition, soft lavender pastel background (#f5f3ff), warm sunlight, clean lines, no text, no border, no watermark, 512x512.

---

## 三、 验收核对标准
1. 全部 5 张图片均为 `512 × 512 px` PNG，严格按上述路径放进 `frontend/public/images/ui/`；
2. 画面中**零乱码文字、零水印、零黑边白框**；
3. 主角 Leon 的发型、脸型与年龄感（11 岁少年）在 5 张图之间保持高度一致。
