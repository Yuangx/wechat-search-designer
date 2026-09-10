# GitHub 发布说明

仓库根目录同时是 Skill 根目录，名称为 `wechat-search-designer`。GitHub 可展示 README、贡献说明与安全说明；Agent 通过根目录 `SKILL.md` 发现能力。

## 当前版本

版本 `0.2.0`，采用 [MIT 许可证](../LICENSE)，版权所有者为 Yuangx。公开包不附第三方 PDF、AI、字体及品牌图片，使用者通过设计输入提供本地标识。演示使用清楚标记的原创占位图。

源码仓库：[Yuangx/wechat-search-designer](https://github.com/Yuangx/wechat-search-designer)。源码提交、Actions 检查和 Tag / Release 分别记录；远端检查结果以仓库 Actions 页面为准，版本下载与校验文件见 Releases。

## 发布前

1. 更新 package.json、package-lock.json、SKILL frontmatter、导出工具版本和发布说明；保留根目录完整 `LICENSE` 并核对许可声明一致。第三方素材仍单独适用其条件。
2. 运行 `npm ci`、`npm run check`、`npm test`；用三类示例查看 PNG、SVG 与手机图。真实品牌标识只作本地测试输入，不进入公开目录。
3. 检查 `distribution-files.json` 的每一项，确保没有真实文章、个人账号、本机绝对路径、原始设计资料、字体和工作日志。按明确文件清单准备仓库，不能上传整个开发工作区。
4. 运行 `npm run package`，解压实际 ZIP，在独立目录重复结构检查、依赖准备与演示。版本产物已经存在时另增版本，保留历史文件。
5. 在目标 GitHub 仓库核对简介与 Topics，并按维护需要启用私密漏洞报告入口。确认远端内容与本地文件一致，等待 Actions 的实际结果。
6. 远端检查通过后，在已验证的提交上创建对应 Tag / Release，上传 ZIP 与 manifest。候选版本使用 prerelease；正式版本说明实际验证的范围，不宣称未测过的系统或宿主已兼容。

## 建议仓库展示信息

- 名称：`wechat-search-designer`
- Description：`Article-aware WeChat Search visual design skill with local PNG, SVG and HTML export.`
- Topics：`agent-skills`、`wechat`、`content-creation`、`graphic-design`、`svg`、`playwright`

包内文档使用相对链接，仓库下载入口指向已建立的公开仓库。维护者身份由 GitHub 仓库展示；材料没有填写私人邮箱或本机路径。

## 结构与平台建议的区别

Agent Skills 格式要求目录含 `SKILL.md`，其 frontmatter 至少有合规的 `name` 与非空 `description`。本仓库额外声明实际环境要求；`agents/openai.yaml` 是宿主扩展，不是通用格式的必填文件。

GitHub 的 README、CONTRIBUTING、CODE_OF_CONDUCT、SECURITY 与 Issue 模板是帮助使用和协作的项目材料，不能把它们全部称为 GitHub 强制要求。MIT 文件负责授权，结构检查负责验证文件与声明是否完整、一致。

官方来源及核对日期见 [规范来源](standards.md)。
