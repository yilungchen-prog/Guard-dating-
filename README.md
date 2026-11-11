# 夜哨交友

保全人員與想認識保全的人的交友網站。純前端（HTML/CSS/JS），後端用 Supabase（專案 guard-dating）。

- 登入：只限 Google（Apple 在 app.js 的 `ENABLE_APPLE` 打開）
- 功能：在線列表、動態牆、私訊、通知、封鎖/檢舉、管理後台
- 部署：GitHub Pages（main 分支根目錄）

## 發布新版本的步驟
1. `app.js` 的 `APP_VERSION` 改成新版本號
2. `index.html` 的 `style.css?v=`、`app.js?v=` 改成同一個版本號
3. `version.json`：`version` 改新版本號，在 `history` 最前面加一筆（版本、日期、改了什麼），只保留 5 筆
