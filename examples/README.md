# 虚构示例

所有文章、公众号名称和场景均为虚构。

| 场景 | 原文 | 设计输入 | 选择 |
| --- | --- | --- | --- |
| 整理文件夹 | [tutorial.md](tutorial.md) | [tutorial.json](tutorial.json) | 配图丰富的工具教程，用搜索条收束 |
| 写下判断 | [opinion.md](opinion.md) | [opinion.json](opinion.json) | 深色文末卡，承接文章价值 |
| 散步记录 | [life.md](life.md) | [life.json](life.json) | 使用原创公园插画的场景卡 |

运行 `npm run demo -- outputs/demo-v1` 会临时把原创占位标识传入这些输入，生成三款演示与一个索引页面。源输入本身没有真实品牌路径，直接用于正式 `render` 时还需要补充 `brand` 信息。

演示输出状态为 `demo_exported`。它证明本地组件和导出链路能够运行，不证明品牌素材已经准备好，也不代替真实文章的视觉审阅。


## 组合图示例

| 输入 | 内容 | 尺寸 |
| --- | --- | --- |
| [composite-wide.json](composite-wide.json) | 教程：生成作者卡 + 搜索 + 默认互动，简介有精简记录 | 1440×720，2:1 |
| [composite-square.json](composite-square.json) | 观点：深色三模块 + 自定义互动 | 1080×1080，1:1 |
| [composite-reuse.json](composite-reuse.json) | 随笔：复用作者卡 + 两项互动，无搜索 | 1080×810，4:3 |

运行 `npm run demo:composite -- outputs/composite-demo`，打开生成的 `index.html`。真实任务的尺寸由用户选择，上表仅用于演示不同形态。

林禾、作者简介和公众号名称全部虚构。`author-avatar.svg/png` 是本项目绘制的几何图形；`author-card.svg/png` 是虚构作者资料的示例，使用 `node scripts/make-author-example.mjs` 可重新生成。无需外部账号或品牌素材。复用示例中的内嵌文字保留为位图。

不含搜索的示例可得到 `exported`，含占位标识的示例仍为 `demo_exported`；两者均须实际视觉检查。演示入口的总状态为 `demo_exported`，不表示真实用户的任务已完成。
