# 规范来源

核对日期：2026-09-10。以下是结构与仓库文档的主要依据，不表示这些机构认证了本项目。

| 来源 | 本项目采用的部分 |
| --- | --- |
| [Agent Skills specification](https://agentskills.io/specification) | Skill 名称、目录、frontmatter、compatibility、metadata、渐进式披露及相对引用 |
| [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) | 根目录介绍、用途、上手、帮助方式与相对链接 |
| [GitHub: Community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) | 区分推荐的协作文件和平台强制规则 |
| [GitHub: Contributing guidelines](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors) | 根目录贡献说明 |
| [GitHub: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) | 明确许可状态；公开可见不能代替开源授权 |
| [GitHub: Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) | 私密报告入口需维护者启用，不能提前声称入口已可用 |
| [GitHub: Issue form syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms) | `.github/ISSUE_TEMPLATE` 表单字段与必填项 |
| [actions/checkout](https://github.com/actions/checkout) / [actions/setup-node](https://github.com/actions/setup-node) | 验证工作流的检出与 Node 环境步骤，使用核对后的提交哈希 |

`npm run check` 是针对本仓库的轻量结构、引用和清单检查，不是通用 YAML 解析器，也不等于所有宿主已验证。可另外使用 Agent Skills 参考验证器或宿主的 Skill 验证工具检查。
