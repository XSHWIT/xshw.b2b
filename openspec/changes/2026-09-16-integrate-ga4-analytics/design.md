## Context

專案為 Vite + React 18 + TypeScript 的 SPA，路由使用 `react-router-dom` （見 `src/App.tsx` ），全域狀態透過 React Context（`CartContext` 、 `I18nProvider` ）管理，資料來源為 Supabase。使用者已於 Firebase Console 建立 `xshw-b2b` 專案並取得 GA4 Measurement ID （ `G-TNR2RMPCY6` ）。

本變更案的核心挑戰有三：

1. **SPA 缺乏原生 pageview**：`gtag.js` 或 Firebase Analytics 預設只在頁面初次載入時發送 `page_view` ，路由切換不會觸發。需在 React Router 層攔截。
2. **Bundle size 控制**：`firebase` 套件完整版超過 500KB，若不採用模組化 import 會顯著拖累首屏效能。
3. **事件命名一致性**：GA4 的電商報表依賴標準事件名稱（`view_item` 、 `add_to_cart` 等），若各處自行命名將導致報表無法使用。

## Goals / Non-Goals

**Goals:**

- 導入 Firebase Web SDK 之 Analytics 模組，並將事件正確上報至現有 GA4 Property（`G-TNR2RMPCY6`）。
- 提供集中式的事件封裝層（`src/api/analytics.ts`），使 UI 元件與 SDK 解耦。
- 支援 SPA 路由切換自動上報 `page_view` 。
- 涵蓋 B2B 型錄的核心轉換漏斗：`view_item_list` → `view_item` → `add_to_cart` 。
- 追蹤語系切換行為與公告點擊行為。
- 僅在正式環境（`import.meta.env.PROD`）與具備 `window` 的環境啟用，避免開發期與 SSR 產生噪音。

**Non-Goals:**

- 不導入 Firebase Auth、Firestore、Remote Config、Cloud Messaging 等其他 Firebase 服務（未來變更再擴充）。
- 不建立 Consent Management Platform（CMP）；本站目標客群為台灣 B2B 客戶，本次僅以隱私權政策文案揭露。
- 不追蹤個資（姓名、電話、Email、IP），亦不上報伺服器端事件。
- 不整合 Google Tag Manager；直接使用 Firebase SDK 上報。
- 不建立自訂 GA4 事件的儀表板／探索報表（由使用者於 GA4 後台自行配置）。

## Decisions

### 1. 採用 Firebase Web SDK 而非 `gtag.js` 或 `react-ga4`

- **說明**：使用 `firebase/analytics` 的 `getAnalytics()` 與 `logEvent()` 取代直接嵌入 `<script src="https://www.googletagmanager.com/gtag/js">` 或 `react-ga4` 套件。
- **優點**：使用者已於 Firebase Console 建立專案並取得完整設定；SDK 為模組化（v9+），支援 tree-shaking；未來擴充 Remote Config、Performance Monitoring 等服務時可共用同一個 `FirebaseApp` 實例。
- **替代方案**：
  - `gtag.js`：無 npm 型別支援，需自行維護型別；未來若要接其他 Firebase 服務仍需重新初始化。
  - `react-ga4`：多一層第三方依賴，且無法無縫接軌 Firebase 生態。

### 2. 事件封裝層與命名規範

- **說明**：所有 GA4 事件皆透過 `src/api/analytics.ts` 匯出的具名函式呼叫（例如 `trackAddToCart(item)` 、 `trackViewItem(item)` ），內部統一將參數轉為 GA4 標準 payload。UI 元件不 import `firebase/analytics` 。
- **優點**：事件名稱與參數集中管理；未來若要抽換分析工具（例如加上 PostHog），只需修改 `analytics.ts` ；型別安全（可為每個事件宣告介面）。
- **替代方案**：各元件直接呼叫 `logEvent(analytics, 'add_to_cart', {...})` 。缺點是命名易分歧、參數格式難以維護。

### 3. 環境變數管理設定

- **說明**：Firebase 設定（含 `apiKey` ）雖為公開值，但仍透過 `.env` 檔注入，於 `src/api/firebaseClient.ts` 讀取 `import.meta.env.VITE_FIREBASE_*` 。同時提供 `.env.example` 作為範本。
- **優點**：避免將 Firebase 金鑰隨程式碼推入版本控制；dev / staging / prod 可使用不同 Firebase Property 隔離資料；Azure Pipelines 可透過 Pipeline Variables 於 build 時注入。
- **注意**：現有 `src/api/supabaseClient.ts` 將金鑰硬編碼（見既有實作）。本變更**不追溯修改** Supabase 的做法，僅為新導入的 Firebase 建立此規範，避免擴大變更範圍。
- **替代方案**：硬編碼於 `firebaseClient.ts` 。缺點是無法區分環境，且與後續 CI/CD 流程耦合度高。

### 4. Route change 觸發 `page_view`

- **說明**：新增 `src/hooks/usePageTracking.ts` ，內部使用 `useLocation()` 取得 `pathname + search` ，於 `useEffect` 中呼叫 `trackPageView({ page_path, page_title })` 。在 `Layout.tsx` 掛載一次即可涵蓋所有路由。
- **優點**：不需在每個 Page 元件內埋設 pageview；隨路由自動觸發。
- **替代方案**：使用 Firebase 內建的 `screen_view` 事件。缺點是 GA4 Web Property 標準報表以 `page_view` 為主，`screen_view` 主要供 App 使用。

### 5. 僅於 Production 啟用

- **說明**：`initializeAnalytics()` 內判斷 `import.meta.env.PROD && typeof window !== 'undefined'` ；於 dev / test 環境回傳 `null` 、事件函式改為 no-op（或 `console.debug` ）。
- **優點**：避免開發時的資料污染 GA4 報表；便於本機除錯（可於 `console` 觀察事件發送）。
- **替代方案**：不做環境判斷。缺點是 dev 事件會與正式事件混合。

### 6. 延遲載入 Analytics（Lazy Init）

- **說明**：使用 `isSupported()` 判斷瀏覽器是否支援 IndexedDB / Cookie 等 Analytics 前置條件；不支援時（例如某些嵌入式 WebView）不初始化，事件函式 no-op。
- **優點**：避免在不支援的環境拋錯導致 UI 崩潰。

## Risks / Trade-offs

- **[Risk] Bundle size 增加**
  - **Mitigation**：僅 import `firebase/app` 與 `firebase/analytics` （modular API v9+），實測約 40–60KB gzip；Vite 已預設程式碼分割。若未來 bundle 過大可考慮改為 dynamic import。
- **[Risk] 廣告攔截器（AdBlock）阻擋 Analytics**
  - **Mitigation**：屬預期行為，不做規避。事件呼叫已包裹於 try-catch，失敗不影響 UI。
- **[Risk] 環境變數未於 Azure Pipelines 設定**
  - **Mitigation**：`firebaseClient.ts` 缺少必要變數時，`console.warn` 並回傳 no-op，避免 build / runtime 崩潰。任務清單包含更新 Pipeline 設定的步驟。
- **[Risk] 隱私法遵**
  - **Mitigation**：於 Firebase Console 啟用 IP 匿名化；不上報使用者可識別資訊（PII）；更新 Privacy 頁面文案。
- **[Trade-off] 未導入 CMP（Cookie Consent）**
  - **理由**：目標市場為台灣，且不追蹤 PII。若未來擴及歐盟／英國客戶，需另立變更案導入 Consent Mode v2。
