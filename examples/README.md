# 虚构示例

所有文章、公众号名称和场景均为虚构。

| 场景 | 原文 | 设计输入 | 选择 |
| --- | --- | --- | --- |
| 整理文件夹 | [tutorial.md](tutorial.md) | [tutorial.json](tutorial.json) | 配图丰富的工具教程，用搜索条收束 |
| 写下判断 | [opinion.md](opinion.md) | [opinion.json](opinion.json) | 深色文末卡，承接文章价值 |
| 散步记录 | [life.md](life.md) | [life.json](life.json) | 使用原创公园插画的场景卡 |

运行 `npm run demo -- outputs/demo-v1` 会临时把原创占位标识传入这些输入，生成三款演示与一个索引页面。源输入本身没有真实品牌路径，直接用于正式 `render` 时还需要补充 `brand` 信息。

演示输出状态为 `demo_exported`。它证明本地组件和导出链路能够运行，不证明品牌素材已经准备好，也不代替真实文章的视觉审阅。

