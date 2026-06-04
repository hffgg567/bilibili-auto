# Bilibili 每日自动签到 & 观看视频

[![Run Bilibili Daily Task](https://github.com/hffgg567/bilibili-auto/actions/workflows/bilibili.yml/badge.svg)](https://github.com/hffgg567/bilibili-auto/actions/workflows/bilibili.yml)

基于 GitHub Actions 的 Bilibili 每日自动任务，每天定时执行签到、观看视频、投币等操作。

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 📺 观看视频 | 模拟心跳观看视频，增加播放量/经验 |
| 🔗 分享视频 | 自动分享视频获取经验（需 BILI_JCT） |
| 🪙 投币 | 每日自动投币（可配置数量） |
| 📊 用户信息 | 执行前后显示用户等级/硬币等信息 |
| 📨 推送通知 | 支持Server酱/PushPlus/Telegram推送结果 |

## 🚀 快速部署

### 1. Fork 或导入此仓库到你的 GitHub

### 2. 获取 Bilibili Cookie

1. 打开 [bilibili.com](https://www.bilibili.com) 并登录
2. 按 `F12` 打开开发者工具 → **Application** → **Cookies**
3. 找到以下 Cookie 值：
   - `SESSDATA` — 登录凭证（**必需**）
   - `bili_jct` — CSRF Token（投币/分享需要）
   - `DedeUserID` — 用户ID
   - `DedeUserName` — 用户名

### 3. 配置 GitHub Secrets

在你的 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** 中添加：

#### 必需配置

| Secret 名 | 说明 |
|-----------|------|
| `SESSDATA` | B站登录 Cookie 中的 SESSDATA |

#### 可选配置

| Secret 名 | 默认值 | 说明 |
|-----------|--------|------|
| `BILI_JCT` | 空 | CSRF Token（投币/分享需要） |
| `DEDEUSERID` | 空 | 用户ID |
| `DEDENAME` | 空 | 用户名 |
| `COIN_NUM` | 0 | 每日投币数量（0-5，0=不投币） |
| `WATCH_NUM` | 5 | 每日观看视频数量 |
| `WATCH_LIST` | 空 | 优先观看的视频BV号，逗号分隔，如 `BV1xx,BV2xx` |
| `PUSH_KEY` | 空 | 推送通知密钥 |
| `PUSH_TYPE` | 空 | 推送类型：`serverchan` / `pushplus` / `telegram` |

### 4. 手动测试

1. 进入仓库 → **Actions** → **Bilibili Daily Task**
2. 点击 **Run workflow** → **Run workflow**
3. 查看运行日志确认是否成功

### 5. 自动执行

配置完成后，每天北京时间 **06:00** 自动执行。如需修改时间，编辑 `.github/workflows/bilibili.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '0 22 * * *'  # UTC 22:00 = 北京时间 06:00
```

常用时间对照：

| 北京时间 | cron 表达式 |
|---------|------------|
| 06:00 | `0 22 * * *` |
| 07:00 | `0 23 * * *` |
| 08:00 | `0 0 * * *` |
| 12:00 | `0 4 * * *` |

## 📨 推送通知配置

### Server酱（推荐）

1. 注册 [sct.ftqq.com](https://sct.ftqq.com/)
2. 获取 SendKey
3. 设置 Secrets：`PUSH_TYPE=serverchan`，`PUSH_KEY=你的SendKey`

### PushPlus

1. 关注微信公众号「PushPlus推送」
2. 获取 Token
3. 设置 Secrets：`PUSH_TYPE=pushplus`，`PUSH_KEY=你的Token`

### Telegram

1. 创建 Bot 获取 Token
2. 获取 Chat ID
3. 设置 Secrets：`PUSH_TYPE=telegram`，`PUSH_KEY=BotToken|ChatId`

## ⚠️ 注意事项

1. **SESSDATA 有效期**：B站 Cookie 有效期约 30 天，过期后需重新获取并更新 Secret
2. **GitHub Actions 限制**：免费账户每月 2000 分钟，每次执行约 2-5 分钟
3. **风控风险**：建议观看视频数量不超过 10 个，投币不超过 5 个，避免被风控
4. **隐私安全**：Cookie 属于敏感信息，请勿泄露，只存储在 GitHub Secrets 中
5. **执行延迟**：GitHub Actions 定时任务可能有几分钟延迟，属正常现象

## 🔧 故障排查

| 问题 | 解决方案 |
|------|---------|
| 签到失败 | 检查 SESSDATA 是否过期，重新获取 |
| 观看视频0个 | 检查网络问题，或手动指定 WATCH_LIST |
| 投币失败 | 需要 BILI_JCT，且账户有足够硬币 |
| Actions 未执行 | 检查仓库是否活跃，GitHub 可能暂停不活跃仓库的定时任务 |

## 📄 License

MIT
