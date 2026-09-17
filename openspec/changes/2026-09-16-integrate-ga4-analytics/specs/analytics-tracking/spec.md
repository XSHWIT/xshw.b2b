## ADDED Requirements

### Requirement: Firebase Analytics 初始化 (Firebase Analytics Initialization)

系統 SHALL 於前端應用啟動時，透過 Firebase Web SDK 初始化 GA4 Analytics 實例，且 SHALL 從環境變數 `VITE_FIREBASE_*` 讀取設定值，並於下列任一情境下不初始化 Analytics 而以 no-op 事件函式取代：（a）任一必要環境變數缺失；（b）執行環境非 `import.meta.env.PROD` ；（c）`firebase/analytics` 的 `isSupported()` 回傳 `false` 。

#### Scenario: 正式環境成功初始化 Analytics
- **GIVEN** `import.meta.env.PROD` 為 `true` 且所有 `VITE_FIREBASE_*` 環境變數皆已設定
- **AND** 瀏覽器支援 Firebase Analytics（`isSupported()` 回傳 `true`）
- **WHEN** 應用程式啟動並載入 `src/api/analytics.ts`
- **THEN** 系統 SHALL 呼叫 `getAnalytics(app)` 建立單例 Analytics 實例，並使 `trackPageView` 等函式後續呼叫時實際上報至 GA4 Measurement ID `G-TNR2RMPCY6` 。

#### Scenario: 開發環境不上報事件
- **GIVEN** `import.meta.env.PROD` 為 `false` （即 `npm run dev` ）
- **WHEN** 任一 `track*` 函式被呼叫
- **THEN** 系統 SHALL NOT 向 GA4 上報事件，且 SHALL 於 `console.debug` 輸出事件名稱與 payload 以利本機驗證。

#### Scenario: 環境變數缺失時降級為 no-op
- **GIVEN** `VITE_FIREBASE_MEASUREMENT_ID` 或其他任一必要環境變數為空字串或 `undefined`
- **WHEN** 應用程式啟動
- **THEN** 系統 SHALL 於 `console.warn` 輸出警告訊息，且 SHALL NOT 拋錯或中斷渲染；所有 `track*` 函式後續呼叫皆為 no-op。

### Requirement: 事件封裝層 (Analytics Event Facade)

系統 SHALL 於 `src/api/analytics.ts` 提供集中式事件函式，UI 元件與 Context SHALL NOT 直接 import `firebase/analytics` 或呼叫 `logEvent` ；所有事件呼叫 SHALL 經過封裝層。

#### Scenario: UI 元件透過封裝層上報事件
- **WHEN** `src/pages/Product/Product.tsx` 需要上報 `view_item` 事件
- **THEN** 元件 SHALL 從 `src/api/analytics.ts` import `trackViewItem` 並呼叫，且 SHALL NOT 直接 import 自 `firebase/analytics` 。

#### Scenario: 事件呼叫失敗不影響 UI
- **GIVEN** GA4 上報請求因網路錯誤或廣告攔截器而失敗
- **WHEN** UI 元件呼叫任一 `track*` 函式
- **THEN** 系統 SHALL 於封裝層內以 try-catch 捕捉例外，且 SHALL NOT 讓錯誤向上冒泡影響元件渲染。

### Requirement: SPA 路由變更觸發 `page_view` (SPA Pageview Tracking)

系統 SHALL 在使用者於 SPA 內導航（React Router 之 `location.pathname` 變化）時，自動上報一次 GA4 `page_view` 事件，且 SHALL 帶入 `page_path` 與 `page_title` 兩個參數。

#### Scenario: 使用者於分類頁之間切換
- **GIVEN** 使用者位於 `/category/tools`
- **WHEN** 使用者點擊導覽列進入 `/category/hardware`
- **THEN** 系統 SHALL 上報一次 `page_view` 事件，`page_path` 為 `/category/hardware` ，`page_title` 為當下 `document.title` 。

#### Scenario: 首次載入頁面
- **WHEN** 使用者透過瀏覽器網址列或外部連結首次進入應用（例如 `/`）
- **THEN** 系統 SHALL 上報一次 `page_view` 事件，且不重複上報 Firebase SDK 內建的初始 `page_view` （即封裝層負責唯一上報來源）。

### Requirement: 電商核心事件追蹤 (E-commerce Core Event Tracking)

系統 SHALL 於下列使用者操作發生時，依 GA4 電商標準事件規格上報事件：

- 使用者進入產品分類頁並成功載入產品清單時，上報 `view_item_list` 。
- 使用者進入產品詳細頁並成功載入產品資料時，上報 `view_item` 。
- 使用者將產品加入詢價單時，上報 `add_to_cart` 。
- 使用者從詢價單移除產品時，上報 `remove_from_cart` 。

#### Scenario: 檢視產品清單
- **GIVEN** 使用者位於 `/category/:categoryId/:subcategoryId`
- **WHEN** 該子分類的產品清單成功由 Supabase 載入
- **THEN** 系統 SHALL 上報 `view_item_list` 事件，帶入 `item_list_id` （子分類 ID）、`item_list_name` （子分類名稱）與 `items` 陣列（最多前 20 筆，每筆包含 `item_id` 、 `item_name` ）。

#### Scenario: 檢視產品詳情
- **GIVEN** 使用者位於 `/product/:productId`
- **WHEN** 該產品資料成功由 Supabase 載入
- **THEN** 系統 SHALL 上報 `view_item` 事件，帶入 `item_id` 、 `item_name` 、 `item_category` 等 GA4 電商標準欄位。

#### Scenario: 加入詢價單
- **WHEN** 使用者於產品詳細頁點擊「加入詢價單」按鈕，`CartContext` 派發 `ADD_ITEM`
- **THEN** 系統 SHALL 上報 `add_to_cart` 事件，帶入 `item_id` 、 `item_name` 、 `quantity` 與 `variant` （spec）；且 SHALL NOT 於 reducer 內產生副作用（事件呼叫需在 dispatcher wrapper 或 `useEffect` 中）。

#### Scenario: 從詢價單移除
- **WHEN** 使用者於詢價單移除某項產品，`CartContext` 派發 `REMOVE_ITEM`
- **THEN** 系統 SHALL 上報 `remove_from_cart` 事件，帶入被移除項目之 `item_id` 、 `item_name` 、 `quantity` 、 `variant` 。

### Requirement: 自訂事件追蹤 (Custom Event Tracking)

系統 SHALL 於下列使用者操作發生時，上報自訂事件：

- 使用者於 Header 切換語系時，上報 `change_language` 事件，帶入 `language` 參數（`zh-TW` 或 `en-US` ）。
- 使用者進入公告詳細頁時，上報 `select_content` 事件，帶入 `content_type: 'announcement'` 與 `content_id: announcement.id` 。

#### Scenario: 切換語系
- **GIVEN** 目前語系為 `zh-TW`
- **WHEN** 使用者於 Header 切換至 `en-US`
- **THEN** 系統 SHALL 上報 `change_language` 事件，`language` 參數為 `en-US` 。

#### Scenario: 檢視公告
- **GIVEN** 使用者位於 `/announcements/:id`
- **WHEN** 該公告資料成功由 Supabase 載入
- **THEN** 系統 SHALL 上報 `select_content` 事件，`content_type` 為 `announcement` ， `content_id` 為公告主鍵 ID。

### Requirement: 隱私與資料最小化 (Privacy and Data Minimization)

系統 SHALL NOT 於任何 GA4 事件參數中包含使用者可識別資訊（PII），包括但不限於姓名、電話、電子郵件、實際地址與 IP。系統 SHALL 於 Firebase Console 啟用 IP 匿名化，且隱私權政策頁面 SHALL 揭露使用 Google Analytics 4 收集匿名瀏覽數據之事實。

#### Scenario: 加入詢價單事件不含 PII
- **WHEN** 系統上報 `add_to_cart` 事件
- **THEN** 事件 payload SHALL 僅包含產品相關欄位（`item_id` 、 `item_name` 、 `quantity` 、 `variant` ），且 SHALL NOT 包含使用者姓名、電話、電子郵件或其他可識別欄位。

#### Scenario: 隱私權頁面揭露 GA4 使用
- **WHEN** 使用者訪問 `/privacy` 頁面
- **THEN** 頁面 SHALL 於當前語系內容中揭露本站使用 Google Analytics 4 進行匿名瀏覽數據收集之事實。
