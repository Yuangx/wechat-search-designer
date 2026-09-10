# 可编辑组件索引

| 文件 | 作用 | 选择依据 |
| --- | --- | --- |
| `assets/components/search-strip.svg` | 一句主题提示与搜索区域 | 配图充分或已有作者卡 |
| `assets/components/end-card.svg` | 标题、价值文案与搜索区域 | 需要承接文章的核心价值 |
| `assets/components/scene-card.svg` | 文字、主题画面与搜索区域 | 已有可用于成品的画面 |
| `assets/components/search-band.svg` | 标识、放大镜、搜索词与背景 | 三种形态共享 |

这些 SVG 是带占位字段的排版组件，由工具填充后交付可编辑 SVG，不是历史 AI 原件的无损导出。组件校验值位于 `assets/manifest.json`。

`examples/` 提供三篇虚构文章和一张原创场景插画。`tests/fixtures/` 提供明显标记为“演示标识”的原创图片。公开包没有自动下载第三方素材的入口，也不要求访问某个创作者的素材库。
