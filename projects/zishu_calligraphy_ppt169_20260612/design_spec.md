# 紫薯书法大成 - Design Spec

> 祝贺紫薯书法大成的祝贺 PPT，5 页。中式油画风格，典雅温馨。

## I. Project Information

| Item | Value |
| ---- | ----- |
| **Project Name** | 紫薯书法大成 |
| **Canvas Format** | PPT 16:9 (1280×720) |
| **Page Count** | 5 |
| **Design Style** | 中式油画风格（Chinese oil painting style） |
| **Target Audience** | 紫薯本人及亲友 |
| **Use Case** | 祝贺紫薯在书法艺术上取得大成 |
| **Created Date** | 2026-06-12 |

---

## II. Canvas Specification

| Property | Value |
| -------- | ----- |
| **Format** | PPT 16:9 |
| **Dimensions** | 1280×720 |
| **viewBox** | `0 0 1280 720` |
| **Margins** | left/right 60px, top/bottom 50px |
| **Content Area** | 1160×620 |

---

## III. Visual Theme

### Theme Style

- **Style**: 中式油画风 —— 融合西方油画质感与东方水墨意境
- **Theme**: Light theme with dark accents
- **Tone**: 典雅、庄重、温馨

### Color Scheme

| Role | HEX | Purpose |
| ---- | --- | ------- |
| **Background** | `#F5F0E8` | 宣纸底色，暖白 |
| **Secondary bg** | `#E8DFD0` | 卡片/区域背景 |
| **Primary** | `#2C1810` | 墨黑，标题装饰 |
| **Accent** | `#C41E3A` | 朱砂红，强调元素 |
| **Secondary accent** | `#8B6914` | 金棕色，点缀 |
| **Body text** | `#3C2415` | 正文深褐 |
| **Secondary text** | `#7A6B5D` | 辅助文字 |
| **Tertiary text** | `#9E8E7E` | 脚注信息 |
| **Border/divider** | `#C4B5A0` | 边框分隔线 |
| **Success** | `#2E7D32` | 正面指标 |

### Gradient Scheme

```xml
<linearGradient id="goldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#8B6914"/>
  <stop offset="100%" stop-color="#D4A843"/>
</linearGradient>

<radialGradient id="bgWarm" cx="50%" cy="40%" r="60%">
  <stop offset="0%" stop-color="#F5F0E8"/>
  <stop offset="100%" stop-color="#E8DFD0"/>
</radialGradient>
```

---

## IV. Font Plan

| Role | Font Stack | Size |
| ---- | ---------- | ---- |
| **Cover title** | "KaiTi", "STKaiti", "SimSun", serif | 60px |
| **Title** | "KaiTi", "STKaiti", "SimSun", serif | 40px |
| **Subtitle** | "KaiTi", "STKaiti", "SimSun", serif | 28px |
| **Body** | "SimSun", "Songti SC", "Times New Roman", serif | 22px |
| **Annotation** | "SimSun", "Songti SC", serif | 16px |
| **English title** | "Georgia", "Times New Roman", serif | 24px |

---

## V. Page Structure

### Page Layouts

| Page | Type | Description |
| ---- | ---- | ----------- |
| 1 | Cover | 标题页：紫薯书法大成，配油画山水背景 |
| 2 | Content | 书法精神：墨池笔冢典故引入 |
| 3 | Content | 祝贺词：经典祝贺书法大成的词句 |
| 4 | Content | 紫薯篇章：书法之路的回望与展望 |
| 5 | Closing | 结语与祝福 |

---

## VI. Content Outline

### Page 1 — 封面

- 主标题：紫薯书法大成
- 副标题：贺紫薯书法艺术大成
- 装饰：朱砂印章 "大成"
- 背景：油画风格山水墨韵

### Page 2 — 书道精神

- 标题：墨池功深 笔冢成山
- 引用王羲之墨池、怀素笔冢典故
- "锲而不舍，金石可镂"

### Page 3 — 祝贺词

- 标题：翰墨因缘 艺海无涯
- 四组祝贺词排列展示
- "百尺竿头，更进一步"

### Page 4 — 紫薯篇章

- 标题：紫气东来 书法大成
- 回顾书法之路
- 展望未来更上层楼

### Page 5 — 结语

- 标题：福寿康宁 翰墨长青
- 祝福语
- 落款装饰

---

## VII. Page Transitions & Animations

| Page | Transition |
| ---- | ---------- |
| All | Fade |

---

## VIII. Image Resource List

| ID | Description | Acquire Via | Status |
| -- | ----------- | ----------- | ------ |
| img_cover_bg | 中式油画山水背景（墨色山水 + 暖色基调） | web | Pending |
| img_ink_brush | 毛笔与墨迹装饰元素 | web | Pending |
| img_seal | 朱砂印章 "大成" 装饰 | web | Pending |

---

## IX. Icon Usage

- 毛笔 icon（页面装饰）
- 印章 icon（角落点缀）
- 山水墨迹线描元素

---

## X. Design Notes

- 整体色调温暖，以宣纸色为底
- 标题用书法楷体，配合朱砂红点缀
- 每页下方保留一定留白，体现中式美学"留白"理念
- 装饰元素用墨迹/印章/毛笔，不过度繁杂
