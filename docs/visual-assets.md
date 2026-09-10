# README 视觉素材

三种图片分别承担介绍项目、展示实际结果和解释流程的作用。插画与实际导出示例分开标注，图片中的信息也用正文与替代文字提供。

## 文件与来源

- `images/hero.png`：2026-09-10 使用宿主内置 `image_gen` 生成的项目概念插画，展示文章转化为引导物料的含义；不是产品截图，不含官方标识、真人或真实公众号。
- `images/workflow.svg`：本项目编写的四步流程图；修改时编辑文字与节点。`images/workflow.png` 是它通过本地浏览器导出的显示版本。
- `images/tutorial-demo.png`、`opinion-demo.png`、`life-demo.png`：本地工具运行虚构文章示例后的实际 PNG 输出，使用原创“演示标识”。

以上素材的许可状态遵循项目 [NOTICE](../NOTICE.md)；AI 生成来源说明不代表微信品牌授权。输入的真实素材及第三方标识不在此目录内。

## 布局参考

参考 [Supabase README](https://github.com/supabase/supabase/blob/master/README.md) 的项目介绍、实际界面和说明图分层，以及 [Excalidraw README](https://github.com/excalidraw/excalidraw/blob/master/README.md) 的效果展示与简短入口组织。仅借鉴信息顺序，没有复制这些项目的图片、品牌或文案。核对日期：2026-09-10。

## 介绍图生成提示词

使用宿主内置生图工具，未调用独立 API 或外部生图账号。下列提示词是本次采用的完整描述；模型更新后重新生成不保证逐像素一致。

```text
Use case: ads-marketing. Asset: original hero banner for a GitHub README, approximately 2.4:1 wide landscape. Create a polished editorial illustration for a Chinese Agent Skill that turns article content into a WeChat search guidance graphic. Left half: generous negative space with impeccably typeset exact Chinese title on two lines: “微信文章” and “搜一搜物料设计”. Below, exact smaller subtitle: “读懂文章，再设计引导图”. Right half: sophisticated tactile paper-cut illustration, an ivory article sheet transforms through a curving green ribbon into three floating compact editorial cards: one search strip, one editorial end card, one illustrated lifestyle card. A generic magnifying-glass icon and abstract text lines express search; use no actual WeChat logo or official search logo, no company logos, no QR code, no portrait, no account identifiers. The cards are conceptual illustrations, not a screenshot. Restrained warm ivory background #F7F8F3, deep forest ink #172C27, emerald green #188255, subtle sage and sand accents. Soft paper grain and carefully cast shadows; clean spacing, sharp edges, balanced hierarchy. Small English package label at top-left: “WECHAT SEARCH DESIGNER”. Exact bottom-left labels: “PNG · SVG · HTML”. No claims of official affiliation, open-source licensing, popularity, stars, certification, or production test results. No extra tiny text, no gradients or neon, no watermark.
```

## 文件校验

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| images/hero.png | 1942 × 809 | `19cac227477ece33f8c0ddb192a30d434c6c941e789f20362bd5c39c16dec25d` |
| images/workflow.svg | 900 × 670 SVG | `1e7ed4f53befa17df30ef81c6805fe3e8ad919b1c825ea545cf2e21c1737e951` |
| images/workflow.png | 900 × 670 | `db88733e21db002ef58e90566e4a1972933c8da5c8674d487c87370532f3b86f` |

新增图片或更新图示时，检查完整文字、移动端显示、来源说明和文件校验，并同步 `distribution-files.json`。

