> 需要作者卡或互动提示时，使用 [组合图输入](composite-input.md)。本页说明兼容保留的三种搜一搜形态。

# 从文章到设计输入

Agent 读取文章后完成语义选择，导出工具只消费已经明确的设计。不要把固定分类器的结果当成文章分析。

## 形态决策

| 文章与位置 | 优先形态 | 改造重点 |
| --- | --- | --- |
| 配图丰富、已有作者卡、只需轻量收束 | `search-strip` | 一句与本文相关的短引导，完整搜索词 |
| 工具教程、观点文章，需要承接价值 | `end-card` | 主题标题、文章价值文案、内容区配色 |
| 有可用的场景照片或插画，需要保留文章气氛 | `scene-card` | 主体画面、文案与左右版面关系 |

默认制作一款。文章已有明确视觉风格时跟随；未提供风格时以易读的文字排版作为起点。模板名不绑定文章类别：生活随笔也可以用搜索条，教程有合适画面也可以用场景卡。给出的理由必须具体说明这篇文章的特征。

默认宽度 1080 px，搜索条、文末卡、场景卡的起始高度分别为 248、480、640 px；内容较长会自动增高。这是本工具的文章插图尺寸，不是原版广告位尺寸。

## 设计 JSON

以 [工具教程输入](../examples/tutorial.json)为可运行示例，复制到当前设计任务目录后修改。输入字段：

| 字段 | 含义 |
| --- | --- |
| `article` / `article_path` | 必填一种；整篇正文文本，或 UTF-8 文本文件路径 |
| `account_name` | 用户准确提供的公众号名称；保持原字、大小写与内部空格 |
| `form` | `search-strip`、`end-card`、`scene-card` |
| `copy.headline` | 必填；70 字以内的引导标题，通常 8–20 字更好 |
| `copy.benefit` | 文末卡、场景卡必填；短句描述本文确有的内容价值；搜索条不填 |
| `analysis` | `topic`、`audience`、`takeaway`、`tone`、`visual_style`、`reason` 六个简短说明 |
| `analysis.evidence` | 数组；每项有原文 `quote` 与它支持的设计决策 `supports`。导出器核验 quote 存在于文章，Agent 核验语义支持关系 |
| `placement` | 可定位的建议位置，如「结语后、作者卡前」 |
| `brand` | 真实导出必填；`path` 为用户提供的 PNG，`variant` 为 `color` 或 `white`，`source` 记录来源，`rights_basis` 记录使用依据。路径相对设计 JSON；`demo: true` 仅供明确要求的演示 |
| `style` | 可选；`mode: light / dark`，以及六位色值 `background / ink / muted / accent`。只改内容区，品牌颜色由组件管理 |
| `image` | 场景卡必填；`path` 为 PNG/JPEG/WebP 本地路径，`alt` 说明画面，`basis` 记录来源依据，`fit` 为 `contain`（默认）或 `cover` |
| `size` | 可选精确像素尺寸 `{ "width": 1080, "height": 640 }`；放不下完整文字时返回最小所需高度 |

相对路径以设计 JSON 所在目录为基准。纯风格参考图片由 Agent 打开阅读，只在 `analysis.visual_style` 记录观察；`image` 表示会进入成品的实际画面。不要把截图中的教程正文、账号数据或未获准的图片误当作装饰素材。

例如设计 JSON 放在 `inputs/`，反白标识放在同级的 `local-assets/`，可补充：

```json
{
  "brand": {
    "path": "../local-assets/wechat-search-white.png",
    "variant": "white",
    "source": "使用者提供的搜一搜反白标识",
    "rights_basis": "填写本次实际提供的使用依据"
  }
}
```

上例只展示新增字段；实际设计还需文章、名称、文案、分析和位置等字段。`rights_basis` 应记录已提供的事实，不能把示例说明原样当作授权证明。浅色内容区配 `white`，深色内容区配 `color`。标识需保持原始横版比例 592:105；解码或比例失败会阻止 PNG 导出。

内容区文字有对比度与边界检查，搜索词支持上下布局和多行完整展示。未指定尺寸的旧输入可自动增加高度；Agent 新任务应先取得用户选择的具体尺寸。辅助文案过长时优先编辑文案，选定的尺寸不自动改变。自定义尺寸有效范围是宽 720–2160、高 120–2400 px。

## 输出与状态

`manifest.json` 保存文章 SHA-256、完整账号名称、文案、分析依据、位置、尺寸、样式、源素材哈希、实际字体和产物哈希；不复制整篇原文或原始文章的绝对路径。

- `exported`：PNG 与手机检查图已导出，自动几何检查通过；初始视觉检查仍为 `pending`。
- `source_only`：SVG 等源文件存在，PNG 未导出。`export_error` 记录具体原因；显式 `--source-only` 时无错误。
- `demo_exported`：使用原创占位标识完成演示导出；`usage_class` 为 `demo_not_for_publication`，不能作为真实品牌成品交付。
- `blocked`：输入、素材或画布无法生成；CLI 返回非零退出状态。

## 记录真正完成的视觉检查

打开实际 PNG、手机检查图和 HTML 预览后，将结果写入单独的 JSON：

```json
{
  "reviewer": "agent_visual_inspection",
  "checks": {
    "exact_account_name": true,
    "mobile_readability": true,
    "brand_proportion_and_clearance": true,
    "article_fit_and_supported_copy": true,
    "image_crop": true
  },
  "notes": "写明实际观察；没有画面时说明裁切检查不适用。"
}
```

执行 `record-review` 时会先核对现有产物哈希，再记录这次人工或 Agent 视觉观察；任何 false 都记为 `needs_revision`，全部通过才记为 `passed`。这个命令只保存观察，不替代打开图片检查。最终对用户使用 `completed` 的前提是 `exported` 且视觉检查为 `passed`。
