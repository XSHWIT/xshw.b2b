## Why

目前專案尚未串接任何網站數據分析工具，無法量化使用者行為（例如熱門產品瀏覽、加入詢價單轉換、公告點擊、語系偏好），亦無法評估行銷與 UI 調整的成效。使用者（管理者）已於 Firebase Console 建立 `xshw-b2b` 專案並開通 Google Analytics 4（Measurement ID： `G-TNR2RMPCY6` ），因此本變更案將把 Firebase Web SDK 中的 Analytics 模組整合至前端 SPA，作為 GA4 的資料上報管道。

## What Changes

- **Firebase SDK 初始化**：導入 `firebase` 套件，於 `src/api/firebaseClient.ts` 建立 App 與 Analytics 實例，透過環境變數 (`VITE_FIREBASE_*`) 注入設定，僅在正式環境（`import.meta.env.PROD`）與瀏覽器端啟用 Analytics。
- **事件封裝層**：新增 `src/api/analytics.ts` 統一封裝 `page_view` 、 GA4 電商標準事件（ `view_item` 、 `view_item_list` 、 `add_to_cart` 、 `remove_from_cart` 、 `view_promotion` ）與自訂事件（ `change_language` ），避免頁面元件直接呼叫 `logEvent` 。
- **路由變更自動追蹤**：新增 `src/hooks/usePageTracking.ts` ，在 `Layout` 中訂閱 React Router 的 `location` 變化並上報 `page_view` ，補足 SPA 預設不自動追蹤路由的缺口。
- **業務事件埋點**：
  - `src/pages/Subcategory/Subcategory.tsx`：進入子分類時上報 `view_item_list` 。
  - `src/pages/Product/Product.tsx`：進入產品詳細頁時上報 `view_item` 。
  - `src/context/CartContext.tsx`：`ADD_ITEM` 、 `REMOVE_ITEM` 時上報 `add_to_cart` / `remove_from_cart` 。
  - `src/hooks/useTranslation.tsx`：切換語系時上報 `change_language` 。
  - `src/pages/Announcements/AnnouncementDetail.tsx`：檢視公告時上報 `select_content`（content_type: `announcement`）。
- **隱私權文件更新**：`src/pages/Privacy/Privacy.tsx` 對應的 `content_pages.privacy` 資料需補充 GA4 / Firebase Analytics 之使用說明（由使用者於 Supabase 後台更新，本次變更僅提供文案範本於任務清單中）。
- **環境設定**：新增 `.env.example` 、更新 `.gitignore` （若尚未忽略 `.env*`），並於 `README.md` 補充 GA4 設定步驟。

## Capabilities

### New Capabilities

- `analytics-tracking` ：建立 Firebase Analytics（GA4）整合、事件封裝層與頁面/業務事件追蹤機制。

### Modified Capabilities

<!-- 本次變更不修改既有 capability 的規範。 -->

## Impact

- **依賴項目**：新增 `firebase` 套件（僅使用 `firebase/app` 與 `firebase/analytics` 模組，透過 Vite 的 tree-shaking 控制 bundle 大小）。
- **環境變數**：新增 `VITE_FIREBASE_API_KEY` 、 `VITE_FIREBASE_AUTH_DOMAIN` 、 `VITE_FIREBASE_PROJECT_ID` 、 `VITE_FIREBASE_STORAGE_BUCKET` 、 `VITE_FIREBASE_MESSAGING_SENDER_ID` 、 `VITE_FIREBASE_APP_ID` 、 `VITE_FIREBASE_MEASUREMENT_ID` 。
- **程式碼結構**：
  - 新增 `src/api/firebaseClient.ts` 、 `src/api/analytics.ts` 、 `src/hooks/usePageTracking.ts` 。
  - 修改 `src/components/Layout/Layout.tsx` 掛載 `usePageTracking` 。
  - 修改 `src/context/CartContext.tsx` 、 `src/hooks/useTranslation.tsx` 、 `src/pages/Product/Product.tsx` 、 `src/pages/Subcategory/Subcategory.tsx` 、 `src/pages/Announcements/AnnouncementDetail.tsx` 插入事件呼叫。
- **佈署**：Azure Pipelines 需注入上述 `VITE_FIREBASE_*` 環境變數（於 build stage 之前設定），否則 Analytics 於正式站將無法上報。
- **法遵**：需於 Firebase Console 啟用 IP 匿名化，並更新隱私權政策文案。
