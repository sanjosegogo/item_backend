# 聖荷西好物購商品後台

這是一個可部署到 GitHub Pages 的手機優先商品管理後台。GitHub 只放操作介面，真正的管理權限與 Google Sheet 寫入都在 `apps-script.gs`。

## 檔案

- `index.html`：後台頁面
- `styles.css`：手機優先樣式
- `app.js`：後台互動與 API 串接
- `apps-script.gs`：Google Apps Script 後端範本

## 安全機制

1. 後台網頁可以公開，但不放密碼或私密金鑰。
2. 業主用 Google 帳號登入。
3. 前端把 Google 登入 token 傳給 Apps Script。
4. Apps Script 驗證 token 的 client id 與 email 白名單。
5. 驗證通過才允許寫入 Google Sheet。
6. 每次儲存會寫入 `admin_logs` 工作表。

## Google Sheet 欄位

`item` 工作表欄位必須維持：

`編號、庫存、特賣、折數、特賣折數、名稱、專櫃價、特價、特賣金額、尺寸、品牌、社團貼文連結、圖片1、圖片2、圖片3、圖片4、圖片5`

`scrolling sign` 工作表欄位必須維持：

`狀態、文案、連結(可選)、到期日`

## 部署步驟

1. 建立或確認 Google Sheet。
2. 從 Google Sheet 網址複製 Sheet ID。
3. 開啟 Apps Script，貼上 `apps-script.gs`。
4. 修改：
   - `SHEET_ID`
   - `ADMIN_EMAILS`
   - `GOOGLE_CLIENT_ID`
5. Apps Script 點選 `Deploy` -> `New deployment`。
6. 類型選 `Web app`。
7. `Execute as` 選部署者本人。
8. `Who has access` 選任何人。
9. 部署後複製 `/exec` 結尾的 Web App URL。
10. 到 Google Cloud 建立 OAuth Client ID，授權來源加入 GitHub Pages 後台網址。
11. 修改 `app.js`：
    - `apiBaseUrl`
    - `googleClientId`
12. 把整個資料夾上傳到 GitHub 的 `item_backend` repo。
13. GitHub repo 進入 `Settings` -> `Pages`。
14. Source 選 `Deploy from a branch`。
15. Branch 選 `main`，Folder 選 `/root`。
16. 開啟 GitHub Pages 網址測試。

## 測試清單

- 未登入時不能進入正式資料。
- 非白名單 Google 帳號會被拒絕。
- 白名單帳號可以新增商品。
- 手機上可以一鍵上下架。
- 前台購物頁重新整理後會看到上下架變更。
- `admin_logs` 有寫入操作紀錄。

## 上線前建議

- 先用一份測試 Google Sheet 部署。
- 確認業主 email 能登入再切換到正式 Sheet。
- 不要把 Google Sheet 開成「知道連結的人可編輯」。
- 不要把密碼、API secret、服務帳號金鑰放進 GitHub。
