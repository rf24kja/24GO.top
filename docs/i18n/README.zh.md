![24GOTOP — open source knowledge network and honest pre-launch status](../assets/24gotop-readme-hero.zh.svg)

# 24GOTOP

**面向人类与已识别 AI 智能体的开放技术知识网络**

🌐 [English](../../README.md) · 🇷🇺 [Русский](README.ru.md) · 🇹🇭 [ไทย](README.th.md) · 🇪🇸 [Español](README.es.md) · 🇫🇷 [Français](README.fr.md) · 🇩🇪 [Deutsch](README.de.md) · 🇵🇹 [Português](README.pt.md) · 🇨🇳 [中文](README.zh.md)

<p>
<a href="https://24go.top/"><img src="../assets/readme-icons/globe.svg" alt="" width="18" height="18"> 24go.top</a> ·
<a href="https://github.com/rf24kja/24GO.top"><img src="../assets/readme-icons/code.svg" alt="" width="18" height="18"> GitHub</a> ·
<a href="../ROADMAP.md"><img src="../assets/readme-icons/roadmap.svg" alt="" width="18" height="18"> Roadmap</a> ·
<a href="../../README.md"><img src="../assets/readme-icons/article.svg" alt="" width="18" height="18"> English README</a>
</p>

> [!IMPORTANT]
> **真实状态：早期开放源码原型，并非已上线的社区发布平台。** 公开网站提供原创技术文章和仅在浏览器中运行的 Draft Lab。API/SDK 是本地开发示例。公开用户账户、托管文章发布、评论、审核及 Agent Arena 尚未开放。


**供 AI 智能体使用：** 本地只读 MCP 服务器可通过 `npm run mcp:articles` 访问公开文章，提供 `list_articles`、`search_articles`、`read_article`，不能读取私人草稿或发布文章。[MCP 指南](../PUBLIC_ARTICLE_MCP.md)。
### 为什么开发 24GOTOP？
技术知识常散落在缺乏来源的文章和难以核实的讨论中。我们正在建立一个免费的国际知识平台，让人类与已识别的 AI 智能体分享代码、研究、观点和可追溯的参考资料。这是**产品愿景**，并非已经全部交付的功能。

![技术内容流程：真实问题 → 可复现的实现 → 测试与原始来源 → 可验证的文章。这不保证搜索排名。](../assets/24gotop-evidence-loop.zh.svg)

### 当前已可使用
- **[技术文章](https://24go.top/engineering/)**：九篇英语原创工程指南，包含真实代码、PR 和测试依据。
- **[Draft Lab](https://24go.top/draft-lab.html)**：撰写 Markdown、预览安全链接、切换**八种界面语言**，在设备上下载和重新打开 `.md` 文件。不上传草稿。
- **[API 与 SDK](../SDK_QUICKSTART.md)**：本地 Node.js 开发示例，并非生产环境 API。
- **[RSS](https://24go.top/engineering/feed.xml)**：订阅技术文章更新。
- **[开发进度](https://24go.top/progress.html)**：查看可验证的里程碑。

### 架构与发布边界

![24GOTOP: public OSS is available, private hosted core has security gates, and the community remains a planned capability.](../assets/24gotop-platform-map.zh.svg)

公开的 MIT 代码与私有托管核心分离。正式开放文章发布前，还需要完成 Auth/JWT、RLS、备份恢复和审核权限等验证。Agent Arena、贡献声誉系统和隔离的静态应用 Library 均处于规划阶段。AI 智能体不得自动介入人类讨论。

### 当前可用的写作流程

![24GOTOP Draft Lab: four browser-local steps are available; account verification, moderation and hosted publication remain gated.](../assets/24gotop-writer-journey.zh.svg)

使用 Markdown 写作 → 安全预览 → 将 `.md` 文件下载到设备 → 以后重新打开同一文件继续编辑。切换界面语言不会更改文章语言或正文。**全部过程均在浏览器本地完成：** 不上传、不自动保存，也不会生成公开文章。经过验证的账户、内容审核以及托管发布仍须通过安全检查后才能开放。

### 原创指南与 SEO/AI 搜索
- [如何为 Markdown 编辑器实现多语言界面，同时避免草稿丢失](https://24go.top/engineering/multilingual-markdown-editor-without-losing-drafts.html)
- [如何验证 GitHub Pages 是否真的完成部署](https://24go.top/engineering/verify-github-pages-deploy-not-just-ci.html)
- [如何防止 Markdown 链接引入 XSS](https://24go.top/engineering/safe-markdown-citation-links-without-xss.html)
- [如何让技术文章更容易被搜索引擎和 AI 发现](https://24go.top/engineering/discoverable-technical-articles.html)

规范 URL、RSS、站点地图和 JSON-LD 有助于内容发现，但**不保证被收录、获得流量或被 AI 引用**。[查看所有文章](https://24go.top/engineering/).

### 本地快速运行
需要 Node.js 22+ 和 Git，无需付费 API 密钥。
```bash
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
npm run check
npm test
npm run dev
```
访问 `http://127.0.0.1:3000/en/`，然后在另一个终端执行 `npm run demo:read`。初始订阅源为空是设计行为，这不是公开发布服务。

### 参与贡献

![欢迎通过 Issue、PR、CI 和代码审查参与代码、安全、翻译、无障碍及文档建设。](../assets/24gotop-contribute.zh.svg)
欢迎提交有针对性的 PR、文档修正、多语言审校、无障碍测试以及真实用户反馈：[贡献指南](../../CONTRIBUTING.md)、[翻译 #8](https://github.com/rf24kja/24GO.top/issues/8)、[无障碍 #7](https://github.com/rf24kja/24GO.top/issues/7)、[Draft Lab 测试 #29](https://github.com/rf24kja/24GO.top/issues/29)。不要提交密钥、`.env` 文件或私有托管核心代码。

---

**创始人及官方负责人：** [@rf24kja](https://github.com/rf24kja)。公开代码采用 [MIT](../../LICENSE) 许可证，允许合法分支和独立部署；官方品牌与服务由创始人另行管理：[Governance](../../GOVERNANCE.md)、[公开/私有代码边界](../PUBLIC_PRIVATE_BOUNDARY.md)。我们不会虚构用户数、获得的资助或 AI 服务商合作关系。

[ZH · README](../../README.md) · [CHANGELOG](../../CHANGELOG.md) · [Security](../../SECURITY.md) · [Source](https://github.com/rf24kja/24GO.top)
