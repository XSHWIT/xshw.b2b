## 1. 基礎建設與環境設定

- [x] 1.1 安裝 `firebase` 套件（`npm install firebase`）。
- [x] 1.2 於專案根目錄新增 `.env.example` ，列出 `VITE_FIREBASE_API_KEY` 、 `VITE_FIREBASE_AUTH_DOMAIN` 、 `VITE_FIREBASE_PROJECT_ID` 、 `VITE_FIREBASE_STORAGE_BUCKET` 、 `VITE_FIREBASE_MESSAGING_SENDER_ID` 、 `VITE_FIREBASE_APP_ID` 、 `VITE_FIREBASE_MEASUREMENT_ID` 七個變數與範例值。
- [x] 1.3 確認 `.gitignore` 已忽略 `.env` 、 `.env.local` 、 `.env.*.local` 。
- [x] 1.4 於本機建立 `.env.local` 並填入 Firebase 設定值（僅本機測試用，不提交）。
- [x] 1.5 於 Cloudflare Pages（Workers Static Assets 模式）之 **Settings → Builds → Variables and secrets** 設定 7 個 `VITE_FIREBASE_*` 變數，Type 為 Variable，套用至 Production 環境（Preview 可選）。
- [x] 1.6 補充 `src/vite-env.d.ts` 定義 `ImportMetaEnv` 介面，提供 `VITE_FIREBASE_*` 型別提示。

## 2. Firebase Client 與 Analytics 事件封裝層

- [x] 2.1 建立 `src/api/firebaseClient.ts` ：
  - 讀取 `import.meta.env.VITE_FIREBASE_*` 組成 `firebaseConfig` 。
  - 缺少任一必要變數時 `console.warn` 並匯出 `firebaseApp = null` 。
  - 匯出單例 `firebaseApp: FirebaseApp | null` 。
- [x] 2.2 建立 `src/api/analytics.ts` ：
  - 使用 `firebase/analytics` 的 `isSupported()` 判斷瀏覽器支援度，僅在 `import.meta.env.PROD && await isSupported()` 為真時透過 `initializeAnalytics(app, { config: { send_page_view: false } })` 初始化，關閉 SDK 自動 page_view，避免與手動 `usePageTracking` 重複。
  - 匯出 `trackPageView({ page_path, page_title })` 、 `trackViewItem(product)` 、 `trackViewItemList({ item_list_id, item_list_name, items })` 、 `trackAddToCart(item)` 、 `trackRemoveFromCart(item)` 、 `trackSelectContent({ content_type, content_id })` 、 `trackChangeLanguage(language)` 等具名函式。
  - 所有函式內部以 try-catch 包裹 `logEvent` ；未初始化時為 no-op。
  - 為每個事件參數宣告 TypeScript 介面（`AnalyticsItem`）。

## 3. 路由變更自動上報 `page_view`

- [x] 3.1 建立 `src/hooks/usePageTracking.ts` ：使用 `useLocation()` 取得 `pathname + search` ，於 `useEffect` 依 `location.pathname` 變化呼叫 `trackPageView({ page_path, page_title: document.title })` ，並以 `setTimeout(0)` 延後至下一 tick，避免 title 尚未由子頁面更新。
- [x] 3.2 於 `src/components/Layout/Layout.tsx` 呼叫 `usePageTracking()` （於 `<Router>` 之內）。

## 4. 業務事件埋點

- [x] 4.1 `src/pages/Subcategory/Subcategory.tsx` ：於子分類與其產品清單成功載入後，呼叫 `trackViewItemList` ，傳入 `item_list_id` 、 `item_list_name` 、 `items` （最多前 20 筆由封裝層自動截斷）。
- [x] 4.2 `src/pages/Product/Product.tsx` ：於產品資料載入完成後，呼叫 `trackViewItem` ，傳入 `item_id` 、 `item_name` 、 `item_category` 。
- [x] 4.3 `src/context/CartContext.tsx` ：於 `addItem` / `removeItem` 的 wrapper（非 reducer 內）呼叫 `trackAddToCart` / `trackRemoveFromCart` ，傳入 `item_id` 、 `item_name` 、 `item_variant`（spec）、 `quantity` 。
- [x] 4.4 `src/hooks/useTranslation.tsx` ：於 `setLanguage` 函式內呼叫 `trackChangeLanguage(nextLang)` 。
- [x] 4.5 `src/pages/Announcements/AnnouncementDetail.tsx` ：於公告資料載入完成後呼叫 `trackSelectContent({ content_type: 'announcement', content_id: announcement.id })` 。

## 5. 隱私權與文件更新

- [ ] 5.1 於 Firebase Console → Analytics → Data Settings 開啟「IP 匿名化」與確認「Google Signals」設定符合需求。
- [ ] 5.2 於 Supabase `content_pages` 資料表中，更新 `slug='privacy'` 的 `content_zh` 與 `content_en` ，補充「本站使用 Google Analytics 4 收集匿名瀏覽數據」之文案。
- [ ] 5.3 （選用）於 `README.md` 新增「環境變數」章節，列出 `VITE_FIREBASE_*` 說明與取得方式。

## 6. 驗證

- [ ] 6.1 執行 `npm run build` 確認 bundle 建置成功、無型別錯誤。
- [ ] 6.2 於本機 `npm run dev` 確認：（a）dev 環境 `console.debug` 顯示事件而非實際上報；（b）操作路由切換、加入詢價單、切換語系、開啟產品／公告等流程時，事件皆被觸發。
- [ ] 6.3 推送至 GitHub，Cloudflare Pages 自動重新部署後，於 GA4 → Reports → Realtime 或 DebugView 驗證下列事件皆有進來：`page_view` 、 `view_item` 、 `view_item_list` 、 `add_to_cart` 、 `remove_from_cart` 、 `select_content` 、 `change_language` 。
- [ ] 6.4 於 AdBlock 開啟的瀏覽器測試網站，確認事件呼叫失敗時 UI 仍正常運作。
