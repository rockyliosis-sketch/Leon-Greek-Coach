# Leon Greek Coach · 全站古希腊美学 UI 配图与去 Emoji 图标生图规范（供 Codex 批量生成）

> **核心视觉铁律**：
> 1. **严禁重画 Leon 本人**：Leon 的真实照片（`/leon_avatar.png`）保持原样，本清单**不生成任何小男孩人物头像**。
> 2. **全站零 Emoji**：彻底替换网页中所有系统 Emoji（`📝 🏛️ 🌅 ☀️ 🌙 🏫 💻 👨‍🏫 🚀 📊 🏆 🃏 🎙️ ⚡`），全部改用统一画风的**古希腊众神/圣物专属徽章图标**。
> 3. **背景图与水印底图绝不干扰文字**：顶部 Banner 右侧自然抹入希腊国旗；所有卡片水印底图均为**左侧纯净留白（65%）+ 右侧低饱和度柔光水印（35%）**，确保左侧中文/希腊语文字 100% 高对比易读。
> 4. **与历史故事馆世界观一脉相承**：大量结合三、四年级历史故事馆中 Leon 熟悉的古希腊众神与英雄意象（雅典娜猫头鹰与橄榄枝、阿波罗太阳与竖琴、阿尔忒弥斯新月、赫尔墨斯翼鞋与羽翼、奥德修斯帆船、帕特农神庙、宙斯闪电与月桂冠）。

---

## 一、 顶部 Hero Banner 专属宽屏背景图（1 张）

### `banner_hero_greece.jpg`
- **输出路径**：`frontend/public/images/ui/banner_hero_greece.jpg`
- **尺寸格式**：`1600 × 440 px`（宽屏 JPG，质量 90）
- **构图硬性要求**：
  - 左侧 **60% 区域**：纯净、平滑、深邃的爱琴海皇家蓝至钴蓝渐变（`#0062cc` → `#0b4f9c`），**无杂乱高光或细节**，用于完美衬托左侧 Leon 真实照片、白色主标题、中间偏左的黄金十二宫段位卡以及进度条；
  - 右侧 **35% 区域**：柔和、自然、半透明地融合飘扬的**希腊蓝白国旗丝绸纹理**与极淡的雅典卫城帕特农神庙远景光晕，边缘与左侧蓝色背景无缝羽化融合，**不要生硬拼接、不要文字、不要边框**。
- **Prompt (EN)**：
  > Ultra-clean modern UI hero banner background in Aegean royal blue gradient (#0062cc to #0b4f9c). Left 60% is smooth, uncluttered deep blue gradient space for crisp white UI typography. Right 35% softly and seamlessly blends a flowing silk Greek national flag (blue and white stripes with white cross) illuminated by gentle golden Mediterranean sunlight and a faint ethereal silhouette of the Parthenon temple in the mist. Seamless painterly feathering transition, refined institutional educational aesthetic, zero text, zero borders, 1600x440 wide aspect ratio.

---

## 二、 核心卡片「右置淡雅水印底图」（共 8 张）

> **统一构图铁律（全部 8 张必须遵守）**：
> - **尺寸**：`1200 × 480 px` PNG（宽卡片）或 `800 × 600 px` PNG（区块竖卡）
> - **排版安全区**：画面**左侧 62% 必须是近乎纯白/极浅主题色留白**，主体古希腊水彩/淡金线条插画集中在**右下角 / 右侧 35% 区域**，整体低对比度、低饱和度（类似高级羊皮纸淡彩水印，透明度视觉观感约 18%–25%），绝不抢夺前景文字！

| # | 文件名（存至 `frontend/public/images/ui/`） | 对应卡片 | 尺寸 | 主题底色 | 古希腊众神/圣物水印意象 |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `bg_card_practice.png` | 每日网站刷题训练大卡 | `1200×480` | 极浅天蓝 `#f5f9ff` | **雅典娜的智慧猫头鹰**展翅停在金色橄榄枝与希腊字母卷轴旁 |
| 2 | `bg_card_history.png` | 希腊历史故事馆大卡 | `1200×480` | 极浅橄榄绿 `#f1f7f4` | **阿波罗金色竖琴**、微缩帕特农神庙与奥德修斯三列桨帆船 |
| 3 | `bg_card_vocab.png` | 区块外 1：每日 3 次背单词 | `1200×480` | 极浅暖象牙 `#fffdf5` | **赫尔墨斯的带翼凉鞋**、飞翔的古希腊莎草纸卷轴与微光星点 |
| 4 | `bg_card_story_daily.png` | 区块外 2：听历史故事选集 | `1200×480` | 极浅青灰绿 `#eef6f2` | **荷马史诗黄金月桂冠**与爱琴海日落波纹帆影 |
| 5 | `bg_block_school.png` | 区块一：学校复习与作业 | `800×600` | 极浅薄荷白 `#f4fdfb` | **雅典学园爱奥尼亚石柱**、展开的古卷与智慧猫头鹰剪影 |
| 6 | `bg_block_web_tutor.png` | 区块二：网站刷题 + 私教课 | `800×600` | 极浅冰蓝白 `#f3f8ff` | **赫尔墨斯带翼头盔**与象征速度与灵感的金色火炬 |
| 7 | `bg_block_preview.png` | 区块三：下节课多科预习 | `800×600` | 极浅薰衣草白 `#f9f7ff` | **阿波罗太阳金轮**、古代星盘罗盘与航海望远镜 |
| 8 | `bg_card_report.png` | Leon 今日学习报告大卡 | `1200×480` | 极浅珍珠白 `#f8fafc` | **奥林匹斯双枝黄金月桂冠**与古希腊蜡封印章纹理 |

### 水印底图通用 Prompt 模板（Codex 按上表逐张替换 `{BG_COLOR}`、`{SUBJECT}`、`{SIZE}`）：
> Minimalist soft watercolor watermark background for a modern educational UI card, {SIZE}. Left 62% is completely clean, smooth solid {BG_COLOR} negative space for legible text overlay. In the right 35% and bottom-right corner only, a delicate, low-contrast, airy pale watercolor and fine pale-gold line-art illustration of {SUBJECT}, fading seamlessly into the {BG_COLOR} background at ~20% visual opacity. Elegant museum-grade ancient Greek aesthetic, ultra-clean, zero text, zero letters, zero borders, zero harsh shadows.

---

## 三、 全站去 Emoji 专属定制图标（共 14 枚）

> **统一视觉风格（全部 14 枚必须严格统一）**：
> - **尺寸格式**：`256 × 256 px`（1:1 正方形）**透明背景 PNG**（若无法直出透明底，则用纯白底方便批处理去背）
> - **质感**：**雅典圣域金蓝珐琅浮雕徽章风（Ancient Greek Gold & Aegean Enamel Emblem Icon）**——圆润精致的现代 2.5D 微立体质感，暖金色金属镶边 + 爱琴海蓝/橄榄绿/琥珀橙珐琅填充，线条极简辨识度极高（缩放到 `24×24px` 依然清晰锐利！），**无任何文字**。

| # | 文件名（存至 `frontend/public/images/ui/`） | 替代的 Emoji | 图标主题与视觉元素（古希腊风） |
| :- | :--- | :--- | :--- |
| 1 | `icon_practice.png` | `📝` | 雅典娜金色羽毛笔斜靠在爱琴海蓝卷轴上，点缀一颗小金星 |
| 2 | `icon_history.png` | `🏛️` | 精致微缩帕特农神庙正面，暖金大理石柱配橄榄绿圆盾底 |
| 3 | `icon_vocab_morning.png` | `🌅` | 阿波罗晨曦金太阳从爱琴海蓝波浪中升起 |
| 4 | `icon_vocab_afternoon.png` | `☀️` | 赫利俄斯灿烂正午太阳徽章，暖金与琥珀光芒 |
| 5 | `icon_vocab_night.png` | `🌙` | 阿尔忒弥斯银白新月与一只极简金色小猫头鹰剪影，深邃夜蓝底 |
| 6 | `icon_block_school.png` | `🏫` | 雅典智慧猫头鹰站在一本翻开的青绿色课本上 |
| 7 | `icon_block_web.png` | `💻` | 赫尔墨斯金色双翼托起一颗发光的爱琴海蓝智慧晶石 |
| 8 | `icon_block_tutor.png` | `👨‍🏫` | 古希腊智慧火炬与打开的蓝金对话书卷 |
| 9 | `icon_block_preview.png` | `🚀` | 古典黄铜航海望远镜指向一颗紫色星辰与罗盘 |
| 10 | `icon_report.png` | `📊` | 展开的象牙白荣誉卷轴，两侧环绕金色橄榄月桂枝 |
| 11 | `icon_trophy.png` | `🏆` | 古希腊双耳金圣杯（Kantharos）配月桂冠，闪耀金光 |
| 12 | `icon_flashcard.png` | `🃏` | 两张交错的蓝金双面闪卡，卡片上带发光星芒（无具体文字） |
| 13 | `icon_mic.png` | `🎙️` | 结合阿波罗竖琴曲线的现代蓝金麦克风与金色声波纹 |
| 14 | `icon_bolt.png` | `⚡` | 宙斯的精致金色闪电徽章，简洁锐利 |

### 专属图标通用 Prompt 模板（Codex 按上表逐枚替换 `{ICON_SUBJECT}`）：
> Refined modern 2.5D emblem UI icon of {ICON_SUBJECT}, inspired by ancient Greek goldsmithing and Aegean enamel art. Warm brushed gold metallic accents with crisp Aegean blue, olive green, or royal purple enamel fills. Centered square icon composition, ultra-clean silhouette readable even at 24px, soft studio rim light, isolated on transparent background, zero text, zero letters, zero watermark, 256x256 PNG.

---

## 四、 基础段位专属徽章（替换青铜→至尊荣耀与星星 Emoji，共 7 枚）

> **存放路径**：`frontend/public/images/ranks/`（与 12 宫黄金圣斗士头像放在一起，统一管理！）
> **尺寸格式**：`256 × 256 px` 透明底 PNG，与黄金十二宫同属**古希腊圣域金属浮雕徽章质感**，彻底消灭 `🥉 🥈 🥇 💎 👑 🔱 🌟 🏅` Emoji！

| # | 文件名（存至 `frontend/public/images/ranks/`） | 替代的 Emoji | 古希腊段位徽章设计描述 |
| :- | :--- | :--- | :--- |
| 1 | `rank_bronze.png` | `🥉`（青铜段位） | 古希腊红铜色圆盾配浮雕橄榄枝，温润青铜金属光泽 |
| 2 | `rank_silver.png` | `🥈`（白银段位） | 精致锻造白银羽翼圆盾，边缘镶嵌淡蓝爱琴海纹饰 |
| 3 | `rank_gold.png` | `🥇`（黄金段位） | 璀璨纯金太阳神圆盾徽章，金色月桂叶环绕 |
| 4 | `rank_diamond.png` | `💎`（钻石段位） | 棱面切割的爱琴海天蓝钻石晶核，外圈镶嵌精致白金与暖金神纹 |
| 5 | `rank_king.png` | `👑`（王者 1–5 星） | 奥林匹斯红金王者王冠，镶嵌绯红宝石与黄金月桂双翼 |
| 6 | `rank_glory.png` | `🔱`（至尊荣耀 1–9 星） | 波塞冬黄金三叉戟配紫金奥林匹斯神辉光环，气势恢宏 |
| 7 | `rank_star.png` | `🌟`（星级标） | 单颗精致立体暖金星芒徽章（前端按星数 1–9 颗横向排列，小尺寸依然锐利） |

### 段位徽章通用 Prompt 模板（Codex 按上表逐枚替换 `{RANK_SUBJECT}`）：
> Prestigious ancient Greek sanctuary rank emblem icon of {RANK_SUBJECT}. Crafted brushed metal and precious enamel finish matching Saint Seiya sanctuary aesthetic, bold crisp silhouette readable at 24px-64px, studio rim lighting, isolated on transparent background, zero text, zero numbers, zero watermark, 256x256 PNG.

---

## 五、 交付与自动接入说明
- **UI 配图 23 张**（1 张 Hero Banner + 8 张卡片水印底图 + 14 枚去 Emoji 专属图标）输出至：`frontend/public/images/ui/`
- **基础段位徽章 7 枚** 输出至：`frontend/public/images/ranks/`
- **总计 30 张图片**。图片全部生成放好后告诉我一声，我会立刻把全站（含首页、向导页、积分规则弹窗与基础段位条）所有 Emoji 彻底清零并全部挂载上线，再做桌面/iPad/手机全尺寸视觉验收。
