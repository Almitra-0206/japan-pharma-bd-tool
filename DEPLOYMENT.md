# Deployment Guide / デプロイガイド / 部署指南

---

## Step 1 — Push to GitHub / GitHubにプッシュ / 推送到 GitHub

```bash
# EN: Initialize git and push to your new GitHub repo
# JA: Gitを初期化し、新規GitHubリポジトリにプッシュ
# ZH: 初始化 git 并推送到你的新 GitHub 仓库

cd japan-pharma-bd-tool
git init
git add .
git commit -m "feat: initial release v4.0 — Japan Pharma BD Assessment Tool"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/japan-pharma-bd-tool.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel / Vercelでデプロイ / 在 Vercel 部署

### EN: Via Vercel Dashboard (no CLI needed)
1. Go to [vercel.com](https://vercel.com) → Sign up / Log in with GitHub
2. Click **"Add New Project"**
3. Import your `japan-pharma-bd-tool` repository
4. Framework: **Create React App** (auto-detected)
5. Click **Deploy** — done in ~2 minutes
6. Your URL: `https://japan-pharma-bd-tool.vercel.app`

### JA: Vercelダッシュボード経由（CLIなし）
1. [vercel.com](https://vercel.com) → GitHubでサインイン
2. **「Add New Project」** をクリック
3. `japan-pharma-bd-tool` リポジトリをインポート
4. フレームワーク: **Create React App**（自動検出）
5. **Deploy** をクリック — 約2分で完了
6. URL例: `https://japan-pharma-bd-tool.vercel.app`

### ZH: 通过 Vercel 控制台（无需 CLI）
1. 前往 [vercel.com](https://vercel.com) → 用 GitHub 登录
2. 点击 **"Add New Project"**
3. 导入 `japan-pharma-bd-tool` 仓库
4. 框架：**Create React App**（自动检测）
5. 点击 **Deploy** — 约2分钟完成
6. 你的网址：`https://japan-pharma-bd-tool.vercel.app`

---

## Step 3 — Add to LinkedIn / LinkedInに追加 / 添加到领英

### EN
1. Open your LinkedIn profile
2. Click **"Add profile section"** → **"Recommended"** → **"Featured"**
3. Select **"Links"** → paste your Vercel URL
4. Title: `Japan Pharma BD Assessment Tool`
5. Description: `Interactive NHI pricing + 新薬創出加算 + LOE simulation for Japan oncology BD`
6. Post the text from `LINKEDIN_POST.md` as a new article/post

### JA
1. LinkedInプロフィールを開く
2. **「プロフィールセクションを追加」** → **「おすすめ」** → **「注目」**
3. **「リンク」** を選択 → VercelのURLを貼り付け
4. タイトル: `Japan Pharma BD Assessment Tool`
5. 投稿: `LINKEDIN_POST.md` のテキストを新規投稿として公開

### ZH
1. 打开领英个人主页
2. 点击 **「添加个人资料版块」** → **「推荐」** → **「精选」**
3. 选择 **「链接」** → 粘贴 Vercel 网址
4. 标题：`Japan Pharma BD Assessment Tool`
5. 发帖：将 `LINKEDIN_POST.md` 中的文本作为新帖子发布

---

## Step 4 — Keep your repo clean / リポジトリを整える / 保持仓库整洁

```bash
# EN: Every time you improve the tool, commit with a clear message
# JA: ツールを改善するたびに、明確なコミットメッセージでコミット
# ZH: 每次改进工具时，用清晰的提交信息进行提交

git add .
git commit -m "feat: add [feature name]"
git push

# EN: Vercel auto-redeploys on every push to main
# JA: mainへのプッシュごとにVercelが自動再デプロイ
# ZH: 每次推送到 main 分支，Vercel 自动重新部署
```

---

## Checklist / チェックリスト / 检查清单

- [ ] **EN:** GitHub repo is public (so Vercel can access it)
      **JA:** GitHubリポジトリがパブリックであること
      **ZH:** GitHub 仓库设为公开（以便 Vercel 访问）

- [ ] **EN:** README has your name / contact added
      **JA:** READMEに自分の名前・連絡先を追加
      **ZH:** README 中添加了你的姓名/联系方式

- [ ] **EN:** Replace `YOUR_USERNAME` in README deploy button
      **JA:** READMEのデプロイボタンの `YOUR_USERNAME` を置換
      **ZH:** 替换 README 部署按钮中的 `YOUR_USERNAME`

- [ ] **EN:** Vercel live URL works on mobile (test before posting)
      **JA:** VercelのURLがモバイルで動作することを確認
      **ZH:** 在手机上测试 Vercel 链接是否正常（发帖前确认）

- [ ] **EN:** LinkedIn Featured section updated with live link
      **JA:** LinkedInの「注目」セクションにライブリンクを追加
      **ZH:** 领英「精选」板块已更新 live 链接

- [ ] **EN:** Post published on LinkedIn
      **JA:** LinkedInに投稿済み
      **ZH:** 领英帖子已发布
