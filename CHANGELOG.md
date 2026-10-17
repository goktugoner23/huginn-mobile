# Changelog

All notable changes to the Huginn React Native project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.4] - 2026-10-17

### Changed
- **Board columns show 3 cards, not 5,** before "Show N more", matching the webapp.

## [0.2.3] - 2026-10-17

### Added
- **Show more / Show less on board columns**, matching the webapp. A column shows its first 5 cards; a "Show N more" button reveals the rest and turns into "Show less". Each column toggles on its own, and the column count still shows the full total.

## [0.2.2] - 2026-10-17

### Fixed
- **The location permission dialog came back on every launch.** `ensureAndroidPermissions` called `PermissionsAndroid.request` unconditionally, and `request` re-prompts for as long as a permission is denied; worse, passing it a `rationale` object makes React Native show its own dialog first whenever Android reports a rationale is due — which is every launch after one refusal. It now checks the real permission state first and asks at most once per permission, remembering that it asked. A granted phone sees nothing, and a "no" stays no until it is changed in Android settings, which `check()` picks up on the next launch. `resetLocationPermissionPrompt()` is exported so a future "Share my location" action in Manifest can ask again.

## [0.2.1] - 2026-10-17

Mirrors the web app's card changes the same day.

### Changed
- **Board cards are one fixed size** — every card is 88dp whatever it holds. The title takes two lines on its own, or one when a description follows, and the meta strip (due date) always occupies the same row so cards never jitter against each other.
- **The move chips are gone from cards.** They sat under the text and made every card a different height. A task now moves from the **Status** row added to the edit dialog — which on mobile is the only way, since there is no drag here.

### Fixed
- **YAML frontmatter leaked into card previews.** Descriptions were rendered raw, so a task written by Alfred or imported from the vault previewed as `--- name: … type: project ---` instead of its body. Mobile now runs the same `stripMarkdown` as the web app — the file is copied verbatim, frontmatter rule included.

## [0.2.0] - 2026-10-15

Tasks board, matching the board added to the web app the same day.

### Added
- **Tasks board view** — one board per task group with three columns (To do / In progress / Done), backed by the new `tasks.status` column and `PATCH /api/tasks/:id/status`. Board is the default view; Groups and List are still there behind a switcher. Two deliberate differences from web, both because this is a phone: the columns scroll horizontally (three 280dp columns do not fit 390dp of screen), and cards move by tapping a column chip rather than by dragging — the web board offers the same buttons as its keyboard path, and on a phone they beat a drag across a horizontal scroll view.

### Fixed
- **The task checkbox never persisted.** It called `saveTask`, but `PUT /api/tasks/:id` only writes name, description, date, due_date and group_id — `completed` was dropped on the floor, so a ticked task came back unticked on the next load. It now goes through the status endpoint, which writes `completed` as well and keeps the board and the list in agreement.

### Removed
- `actionButtonPressed` styles in `Appbar` and `Snackbar`, dead since the pressed-state fix in 0.1.0.

## [0.1.0] - 2026-10-15

Web-parity pass. The mobile drawer carried 9 entries against the web app's 19;
this closes part of that gap. Nothing was removed — mobile-only screens (the
Workout `Exercise` tab, the richer Transactions tabs) stay as they are.

### Added
- **Huginn Server** (Systems) — overview cards (CPU, memory, containers, docker disk, server disk), container list with live CPU/memory stats, and a log viewer. Same four endpoints and interfaces as the web module, so both clients read one contract.
- **Artifacts** (Workspace) — searchable, folder-filtered artifact list and a full-screen viewer. The web page renders artifacts in an iframe; mobile uses a `WebView` against the same signed view URL, since the artifact is an HTML document either way.
- **Diagnostics** (Systems) — error log with level filter, per-service counts, expandable stack traces and context, plus the clear action (confirmed first, since it deletes `error_log` rows with no undo).
- **Repositories** (Systems) — Forge/GitHub toggle, repo list, and a detail view with commits, README and language breakdown. Forge and GitHub differ only in field names on the wire (`stars_count` vs `stargazers_count`), so both normalise into one row model.
- **Investments** (Workspace) — promoted the existing `InvestmentsTab` to its own drawer entry to match the web nav. The Transactions tab still reaches the same screen.
- **Insights** (Workspace) — generated monthly reports over the transaction ledger, reading `/api/insights`.
- **Health** (Workspace) — Apple Health metrics from `vitals_samples`: latest value per metric and a 30-day series for the selected one. Reads the new `/api/vitals/{persons,summary,series}` routes added to huginn-external for this, since the web page queries the table directly.
- **Workout → History, Notes and Tyr tabs** — the three tabs the web workspace had and mobile did not. Tyr keeps the web's Correlation / Summary / Coach-notes sections, the 8/12/26-week windows and the same trend arithmetic.
- **Xikipedia and Xikipedia CS** (Intelligence) — the discovery feed, as a full-screen vertical pager. `services/feed-engine.ts` is the web file copied verbatim, so scoring, the 40/42/18 pick split and the seen-penalty are identical; swiping past a post, tapping the title, tapping the image and the heart map to the same four engagement scores, and each corpus keeps its own learned profile. The browser downloads the 36MB brotli corpus and inflates it natively (~120MB of JSON); RN's fetch cannot decode `Content-Encoding: br` and a phone should not hold that anyway, so huginn-external now publishes a gzipped sample per corpus (12,000 pages, 5.7MB and 1.7MB) with a title index covering every page those pages link to — the pool of pages shrinks, how any page scores does not.

### Changed
- **Drawer now mirrors the web nav exactly** — same three groups, same order, same titles, blurbs and icons as `dashboard-navigation.ts`. Workout and WT Registry move from Systems to Workspace.
- **Workout tabs moved to a scrollable top bar** — seven tabs do not fit a bottom bar, and the web workspace uses a horizontal row anyway.
- **Dashboard cards take their icon from the nav item** — one list instead of a second `ICON_MAP` that silently fell back to a clock for every new entry.

### Fixed
- **Styles were dropped from every component that passed `style` as a function.** `nativewind/babel` wraps React Native components and never invokes a `({ pressed }) => [...]` style prop, so the result was discarded. Dashboard cards rendered with no width, padding, border or background: each row sized its two cards to their own text, columns landed at a different x on every row, and long blurbs ran off the screen. Converted all 31 occurrences across 11 files (`Card`, `List`, `Tabs`, `Chip`, `FAB`, `IconButton`, `SegmentedControl`, `Appbar`, `Snackbar`, `ChatInput`, `RichTextEditor`) to plain arrays, with `android_ripple` where press feedback mattered.
- **Crash on Android 14+ when location sharing started.** `react-native-background-actions` called `startForeground()` with type `none`, which targetSdk 34 prohibits, and the app died with `InvalidForegroundServiceTypeException`. The manifest already declared `foregroundServiceType="location"`; the runtime call now passes it too.
- **Drawer screens showed their route name as the header title** — "ServerScreen" instead of "Huginn Server", "WTRegistry" instead of "WT Registry".

### Notes
- Coach notes and workout notes render as plain text. Mobile has no markdown renderer anywhere, so this matches the rest of the app rather than adding a dependency for one tab.
- Manifest stays web-only, as agreed.

## [Unreleased] - 2026-04-17

### Changed
- **Authenticated Binance websocket handshake** — The legacy futures websocket now sends `Authorization: Bearer <HUGINN_API_TOKEN>` during the `/ws` handshake, matching the backend auth gate.

### Fixed
- **Dashboard transaction totals** — Dashboard transaction and derived history totals now use the backend-provided paginated `total` instead of capping at the fetched page length.
- **Transaction cache counts** — Shared transaction count helpers now honor `/api/transactions` responses shaped as `{ items, total }`.

---

## [Unreleased] - 2026-04-05

### Added
- **R2 key-based media architecture** — Introduced `useResolvedUri(keyOrUrl)` hook that resolves opaque R2 keys to short-lived signed URLs on render with caching and legacy URL fallback. All screens that display stored attachments (notes, investments, history, wtregistry students, muninn chat) now resolve keys at display time instead of persisting signed URLs.
- **Muninn R2 key send** — `ChatInput` captures and sends R2 keys in the chat payload instead of 10-min signed URLs. Paired with huginn-external re-signing at OpenAI dispatch and GET response, historical conversations remain valid indefinitely.
- **`colors.overlay` theme token** — Single source of truth for modal scrims across light/dark themes.
- **Student photo lifecycle** — WTRegistry `StudentsTab` uploads new photos via `uploadFileToStorage` + cleans up old keys via `deleteFileFromStorage` on replace/delete.

### Changed
- **Firebase fully eradicated** — Removed all firebase/firestore code, the `firebase` npm package (67 transitive deps), `serviceAccountKey.json`, `android/google-services.json`, `.kiro/`, firebase cursor rules, and every firebase reference from docs/configs. Mobile now talks exclusively to huginn-external + Cloudflare R2.
- **Binance API client** — Rewrote `features/transactions/services/binanceApi.ts` on the shared `httpClient` to get Bearer auth compliance. No more raw axios against the external VM.
- **FuturesTab styles** — Converted to `createStyles(colors: ColorScheme)` factory with `useMemo` for theme-aware static StyleSheets.
- **`futuresCalculations`** — Semantic tones (`'positive' | 'negative'`, `RiskTone`) replacing hardcoded hex. Consumers resolve tones via `useColors()`.
- **Calendar marked dates** — `useMarkedDates` consumes `useColors()` internally. Hardcoded dot colors (`#FFD700/#4CAF50/#F44336/#2196F3`) replaced with `colors.warning/success/destructive/info`.
- **Modal scrims** — All modals in notes + muninn use `colors.overlay` token.
- **Tasks create flow** — `saveTask`/`saveTaskGroup` return persisted entities from `RETURNING *`, eliminating `Date.now()` placeholder IDs.
- **EditNoteScreen pickers** — All 6 attachment paths (camera/gallery image, camera/gallery video, voice, drawing) route through `uploadAndAppendAttachment` → `MediaService.uploadMedia`. Dirty-check now uses a stable `originalAttachmentsRef`. Load path resolves display URIs async via `getDisplayUrl` with `buildLegacyRedirectUrl` fallback.
- **`wtRegistrySlice`** — Renamed 12 stale `*Firestore`/`*Firebase` aliases to `*Remote` pattern.

### Removed
- `src/shared/services/firebase/` entire directory (6 files)
- `src/shared/utils/fileUtils.ts` (dead code)
- `src/features/notes/store/notesSlice.ts` + `notesHooks.ts` (notes use TanStack Query exclusively)
- `src/features/transactions/components/InvestmentCard.tsx` + `InvestmentForm.tsx` (orphans)
- `src/features/workout/screens/tabs/WorkoutDashboard.tsx` (dead stub)
- Empty barrel directories in `features/history/`
- Orphaned remote thunks/state/reducers in `calendarSlice`
- Legacy data SDK and all related references

### Fixed
- Muninn attachment URLs no longer expire in conversation history (backend re-signs keys on GET).
- Voice recordings in notes now upload via `MediaService` instead of persisting raw `file://` URIs.
- AttachmentGallery download button re-signs R2 keys via `getDisplayUrl` before invoking the downloader.
- File extension detection in notes uses the `MediaType` enum.

### Infrastructure
- Stripped `Co-Authored-By` trailer from all historical commits on `test` branch.
- Added `CLAUDE.md` + `.claude/` to `.gitignore`; untracked previously-committed `CLAUDE.md`.

---

## [Unreleased] - Backend consolidation
- Removed the legacy data SDK and all related references from the mobile codebase
- Data layer now talks exclusively to huginn-external REST API
- Media storage migrated to Cloudflare R2 via huginn-external /api/storage
- Previous entries in this changelog that reference the old data layer are historical

## [Unreleased] - 2026-04-04

### Changed
- **App Icon**: Updated to Huginn raven logo
- **Project Rename**: Renamed from "allinone" to "Huginn" across the project

### Removed
- **Instagram Module**: Removed Instagram profiler references from documentation

---

## [2.3.0] - Unreleased

### Added
- **GPT Attachment Bottom Sheet**: Replaced native `Alert.alert` picker with a themed bottom sheet modal
  - Horizontal icon grid (Photo, File, Voice) with distinct accent colors
  - Dismisses on backdrop tap, Android back button, and option selection
  - Consistent with app's modal design language
- **Note Linking (`[[Note Title]]`)**: Obsidian-style internal note linking in the rich text editor
  - Type `[[` to trigger autocomplete dropdown with filtered note suggestions
  - Selecting a note replaces `[[query` with a styled clickable link (`note://` scheme)
  - Tapping a note link navigates to the linked note via stack push (preserves current editor state)
  - Custom CSS styling for note links in the WebView editor
- **AED Currency Support**: TRY/AED currency switching across the app
  - New `useCurrency` hook with React Context provider
  - Exchange rate fetched from fawazahmed0/exchange-api (jsdelivr CDN + fallback URL)
  - 6-hour rate caching in AsyncStorage
  - Currency toggle button in BalanceCard header
  - `Intl.NumberFormat` for locale-aware currency formatting
  - HistoryScreen updated to use currency context
- **History Date Search**: Search by date across all history item types
  - Supports YYYY-MM-DD, DD.MM.YYYY, and DD/MM/YYYY formats
  - Filters transactions, investments, and registrations by exact date match
- **GPT Conversation Export**: Share/export conversations from GPT screen
  - Formats messages as readable text with role labels and separators
  - Uses React Native `Share.share()` API for cross-app sharing
  - Share button in GPT header (visible when messages exist)
- **Workout Program Edit (Backend)**: `update_program` action added to GPT workout tool
  - Supports updating program name and exercises via AI function calling

### Changed
- **WTRegistryScreen Split**: Decomposed 2062-line monolith into 8 focused files
  - Extracted `FullscreenImage` to shared UI (reusable pinch-to-zoom viewer)
  - Extracted 4 dialog components: AddStudentDialog, EditStudentDialog, AddRegistrationDialog, EditRegistrationDialog
  - Extracted StudentsTab and RegisterTab as standalone screens
  - WTRegistryScreen reduced to ~50 lines (tab navigator only)
  - Removed 7 dead CSS styles
- **Consolidated Currency Formatting**: Replaced 5 local `formatCurrency` functions and 3 inline `Intl.NumberFormat` calls with `useCurrency().format`
- **Consolidated Date Formatting**: Replaced 3 local `formatDate` functions with shared `formatDate` utility
- **Currency Precision**: Updated `useCurrency` to always use 2 decimal places (kuruş precision for TRY)

### Fixed
- **Remote Storage Uploads (Hermes compatibility)**: Fixed all file uploads across the app
  - Root cause: Hermes runtime can't create Blob from `Uint8Array`/`ArrayBuffer` — the data SDK's upload helper crashes
  - Fix: Read files as base64 via ReactNativeBlobUtil, convert to native Blob via `fetch(data:URI).blob()`, then upload with native Blob
  - All 3 upload services fixed: MediaService, remoteStorage, wtRegistry
  - Added content type metadata to all upload paths
- **Notes Editor Toolbar**: Fixed broken icons and poor usability
  - Replaced missing/ambiguous Ionicons (`"heading"` → `?`) with styled text labels (B, I, U, S, H1, H2, H3)
  - Increased button size from 32x32 to 38x38 and icon size from 18px to 22px
  - Increased divider spacing from 4px to 8px for better visual grouping
- **TypeScript Errors (25 → 0)**: Fixed all compilation errors
  - Chip, Divider, Searchbar: `style?: ViewStyle` → `style?: StyleProp<ViewStyle>` for style array support
  - Removed invalid barrel export from `src/index.ts`
  - Fixed Snackbar useEffect return path consistency
- **Turkish Character Encoding**: Fixed ü→fc, ç→e7 rendering in Notes editor
  - Added `<meta charset="UTF-8">` to react-native-pell-rich-editor WebView HTML template (via patch-package)
  - Added numeric HTML entity decoding (decimal + hex) to `stripHtmlTags` utility
- **GPT Conversation Scroll**: Fixed chat snapping back to end when scrolling up
  - Removed `onContentSizeChange` that called `scrollToEnd` on every content resize
  - Existing `useEffect` on `messages.length` already handles auto-scroll on new messages
- **GPT Topic Sticking**: Fixed AI getting stuck on previous conversation topics
  - Added "Conversation Focus" section to system prompt with 6 rules
  - AI now responds only to the current message topic, drops unanswered questions when user moves on
- **Workout Programs List Refresh**: Programs list now refreshes on screen focus and supports pull-to-refresh
  - Added `useIsFocused` hook for automatic refetch when navigating back
  - Added `RefreshControl` for manual pull-to-refresh

- **GPT AI Assistant**: Full-featured AI chat drawer screen powered by OpenAI GPT-5.2
  - Multi-conversation support with backend persistence (like ChatGPT web app)
  - 9 AI tools for full CRUD on all backend collections (transactions, tasks, notes, calendar, WT registry, workout)
  - Navigation tool: AI can direct users to any app screen
  - User interaction tools: AI can present choice prompts and confirmation dialogs
  - General info tool: data summary, app info, current time
  - Auto-generated conversation titles after first exchange
  - Business logic enforcement (paid registration → auto-create transaction, group completion tracking)
  - OpenAI function calling tool loop with up to 50 iterations per request
  - Backend: new `ai-chat` Fastify module at `/api/ai-chat/*` with 6 REST endpoints
  - Frontend: GPTScreen with ChatBubble, ChatInput, TypingIndicator, UserChoiceCard, ConfirmationCard, ConversationList components
  - Redux slice for conversation state management
  - 120s API timeout for long-running AI calls
  - AI chat endpoints exempt from rate limiting
- **Shared Backend Admin Init**: Extracted admin SDK initialization into a shared backend utility
- **Database Composite Indexes**: Added indexes for `transactions(category+date)` and `tasks(groupId+date)`
- **Soft Minimal UI Design System**: Complete UI overhaul with new aesthetic
  - New color palette: Indigo primary (#6366F1 light, #818CF8 dark)
  - Softer backgrounds (#FAFBFC light, #0C0D10 dark)
  - Larger border radii (sm: 6, md: 10, lg: 14, xl: 20)
  - Reduced shadow opacity for subtler depth
- **New Custom UI Components**:
  - `Appbar`: Header with back/menu/close navigation, safe area aware
  - `Searchbar`: Pill-shaped search input with clear button
  - `Snackbar`: Animated toast notifications with Reanimated
  - `Checkbox`: Rounded checkbox with label support
  - `Divider`: Horizontal/vertical separators
- **Typography Refinements**:
  - Reduced heading weights (700 → 600) for softer appearance
  - New `subtitle` text style
  - Lighter button font weight

### Changed
- **Complete React Native Paper Migration**: Removed dependency on react-native-paper
  - Migrated 41 files across 8 features to custom shadcn-style components
  - Consolidated dual theme system into single unified ThemeContext
  - Deleted legacy `src/theme.ts`
- **Package Updates**:
  - Updated `@shopify/react-native-skia` to 2.4.18 (fixes peer dependency conflict with reanimated 4.x)
  - Added npm overrides for `fast-xml-parser` to fix security vulnerability
- Migrated to TanStack Query for data fetching and caching
- Integrated NativeWind (Tailwind CSS) for styling
- Restructured project to feature-first architecture
- Updated ESLint and Prettier configurations
- Fixed TypeScript strict mode issues
- **WebSocket Configuration**: Moved WebSocket URL to environment variables

### Fixed
- **UI Theming Overhaul**: Replaced hardcoded colors with theme-aware colors across entire codebase
  - Shared UI components: `AddFab`, `RefreshFab`, `Chip`, `Tabs`, `ProgressBar`, `AudioPlayer`, `Card`
  - All components now properly support light/dark theme switching
  - Fixed `Card` component to accept `StyleProp<ViewStyle>` for style arrays
- TypeScript compilation errors resolved across all modified files
- **WebSocket Race Condition**: Fixed subscription calls in `FuturesTab.tsx` to only execute when WebSocket is connected
- **COIN-M Styling**: Applied consistent theme colors to COIN-M error chips and status indicators

### Removed
- `react-native-paper` dependency (replaced with custom components)
- Legacy `src/theme.ts` file (consolidated into `src/shared/theme/`)

### Security
- Fixed 7 npm audit vulnerabilities (axios, fast-xml-parser, glob, js-yaml, lodash, tmp)
- Resolved peer dependency conflict between @shopify/react-native-skia and react-native-reanimated

---

## [2.0.0] - 2024-12

### Added
- **TanStack Query Integration**: Migrated all features to use TanStack Query for data fetching, caching, and state management
- **NativeWind/Tailwind CSS**: Added utility-first CSS styling support
- **Feature-First Architecture**: Complete codebase restructure with feature-based organization
- **Shared Utilities**: Centralized logger, validation, and performance monitoring utilities
- **Type Safety**: Enhanced TypeScript types across all features

### Changed
- Refactored all screens to use new architecture patterns
- Updated path aliases for cleaner imports (`@features/*`, `@shared/*`, `@App`)
- Improved error handling with centralized error boundaries
- Enhanced caching mechanisms across all data fetching operations

### Fixed
- TypeScript strict mode compliance
- ESLint and Prettier configuration issues
- Babel configuration for NativeWind preset
- Date serialization in Redux state

---

## [1.6.0] - 2024-12

### Added
- **Instagram Image Component**: New InstagramImage component for reliable image loading
- **All-in-One API Endpoint**: Combined profile, stories, and posts fetching in single call
- **Posts Tab**: Display user posts alongside stories in ProfileDetailScreen
- **Linear Progress Bar**: Loading indicators for better UX feedback

### Changed
- Refactored InstagramImage to use direct Instagram URLs instead of proxy
- Updated ProfileDetailScreen to use combined data fetching
- Enhanced caching mechanism for combined Instagram data
- Improved error handling with better user feedback messages

### Removed
- Instagram proxy utility (no longer needed)

---

## [1.5.0] - 2024-11

### Added
- **Instagram Profiler Module**: Complete Instagram profile viewing functionality
  - ProfilerTab for managing tracked usernames
  - ProfileDetailScreen for viewing profile details and stories
  - Story viewing with full-screen modal and swipe navigation
  - Bulk story download with progress indicators
  - Avatar caching for better performance
- **Camera Roll Integration**: Save Instagram stories to device gallery
- **Instagram API Service**: Methods for profile pictures, stories, and posts

### Changed
- Enhanced Instagram navigation with stack navigator
- Added PostDetailScreen for detailed post viewing
- Improved hashtag formatting with formatHashtagForDisplay function
- Updated AndroidManifest.xml for network security configuration

### Fixed
- 404 error detection for unavailable profiles
- Story modal scrolling behavior
- Error re-throwing in saveStoryToGallery

---

## [1.4.0] - 2024-11

### Added
- **COIN-M Futures Support**: New CoinMFuturesAccountCard component
  - Display coin balances with USD value estimates
  - Position value and unrealized PnL tracking
  - Conditional COIN-M chip rendering
- **WebSocket Live Data**: Real-time updates for futures screens
- **Connection Status Indicators**: Visual feedback for WebSocket connections
- **Delete Workout Functionality**: Remove workouts with confirmation dialog

### Changed
- Updated position color representation (green for LONG, red for SHORT)
- Enhanced liquidation price calculations to consider all positions
- Improved currency formatting consistency in FuturesTab
- Refactored FuturesPositionCard for better theme support

### Fixed
- Liquidation distance calculations accuracy
- Position type display based on amount

---

## [1.3.0] - 2024-10

### Added
- **Workout Module**: Complete workout tracking system
  - StopwatchScreen for timing workouts
  - WorkoutNavigator for module navigation
  - Workout history tracking
  - Delete workout functionality
- **FlashList Integration**: High-performance list rendering
- **Native Screen Optimization**: Screen freezing for memory optimization

### Changed
- Integrated WorkoutTabs into drawer navigator
- Added workoutReducer to Redux store
- Updated package dependencies for FlashList
- Enhanced workout state management

### Fixed
- Gradle build errors on Windows
- Performance issues with large lists

---

## [1.2.0] - 2024-10

### Added
- **Professional Drawing System**: GPU-accelerated drawing with Skia engine
  - 14-color palette with visual feedback
  - 8 brush sizes (1px-20px)
  - Eraser mode for corrections
  - Undo/redo functionality
  - Dual save options (SVG for notes, PNG for gallery)
- **Investment Attachments**: Support for images, videos, and audio in investments
  - Voice recorder integration
  - Attachment preview modals
  - Multiple URI storage

### Changed
- Enhanced transaction handling with investment integration
- Updated HistoryScreen to revert investment effects on transaction deletion
- Improved TransactionForm with investment selection

### Fixed
- Transaction-investment linking issues
- Attachment upload handling

---

## [1.1.0] - 2024-09

### Added
- **Calendar & Events System**: Complete calendar implementation
  - Event management with backend integration
  - Color-coded calendar dots (Red > Green > Yellow > Blue priority)
  - Auto-generated events from WT Registry data
  - Event details modal with rich information display
- **Notes Feature**: Rich text notes with media attachments
  - Stack navigation for notes management
  - Rich text editor via react-native-pell-rich-editor
  - Attachment gallery for previewing media
  - Audio recording and playback support
- **Tasks Module**: Task management with groups
  - TasksScreen for task organization
  - Task groups with color coding
  - Add/Edit task dialogs

### Changed
- Enhanced balance management with force refresh mechanism
- Refactored transaction screens to modular tabs
- Improved lesson management in WTRegistryScreen
- Updated month filtering for registrations

### Fixed
- Remote event CRUD operations
- Redux state serialization for events
- Cache invalidation logic

---

## [1.0.0] - 2024-08

### Added
- **Transaction Management**: Complete financial tracking
  - Income and expense recording
  - 11 predefined categories with custom icons
  - Transaction summary pie chart
  - Pagination for transaction history
- **Investment Portfolio**: Portfolio monitoring
  - Investment tracking with current values
  - Binance futures integration
  - P&L calculations
- **Wing Tsun Registry**: Student management system
  - Student database with profile photos
  - Registration tracking with payments
  - Lesson scheduling
  - Seminar organization
- **Core Infrastructure**:
  - Backend database integration
  - Remote storage for media
  - Redux Toolkit state management
  - React Navigation 7 setup
  - React Native Paper UI components

### Technical
- React Native 0.80.2 setup
- TypeScript configuration
- ESLint and Prettier setup
- Path aliases configuration

---

## Git Commit History (Chronological)

### December 2024
- `46b5447` - Update gitignore
- `ea94af5` - Refactor InstagramImage component to remove proxy handling
- `2837b67` - Refactor ProfileDetailScreen to utilize new all-in-one API endpoint
- `425aee0` - Update package dependencies and improve Instagram proxy handling
- `f71636a` - Implement Posts Tab in ProfileDetailScreen
- `53e8a8d` - Enhance ProfileDetailScreen with Linear Progress Bar

### November 2024
- `4acce12` - Refactor attachment handling in InvestmentsTab
- `ec095ac` - Refactor BalanceCard and transaction services
- `fe53795` - Move web config to env and purge legacy config from history
- `5735e7b` - Update environment variable handling and backend configuration
- `b0342e1` - Add Instagram profile picture download functionality
- `e36049d` - Refactor image handling in Instagram screens
- `83c6429` - Implement COIN-M Futures Account Card
- `eca896c` - Update FuturesTab and futures calculations
- `cfc22c4` - Sort and paginate transactions in ReportsTab
- `22b4649` - Enhance FuturesTab functionality with WebSocket support
- `75df981` - Refactor UI components: Replace PurpleFab with AddFab
- `349c3f4` - Refactor TransactionHomeScreen
- `2b6e23e` - Refactor dialog components in RegisterTab, StudentsTab
- `968a233` - Fixed duplicate transaction adding issue in registrations
- `128ce52` - Improve error handling in ProfileDetailScreen
- `50a6c58` - Enhance ProfileDetailScreen functionality
- `39b7226` - Refactor FuturesTab and InvestmentsTab UI
- `0df9fe2` - Add delete workout functionality
- `3bddec0` - Enhance ProfileDetailScreen and ProfilerTab
- `6834541` - Add camera roll functionality and improve profile detail screen
- `475dcf9` - Add Profiler feature to Instagram module

### October 2024
- `ded4b1a` - Update AndroidManifest.xml for network security
- `da6e61d` - Enhance transaction handling and investment integration
- `d9b074f` - Implement investment attachment functionality
- `9121923` - Enhance NotesScreen navigation and video rendering
- `bc4cfb3` - Fix Windows Gradle build errors, implement caching
- `4e01c02` - Delete outdated specifications
- `24ab2e2` - Integrate Stopwatch into Workout module
- `bb5c9e5` - Add Workout module to navigation
- `c55e96b` - Refactor babel.config.js
- `ccb8d94` - Refactor Instagram module and enhance hashtag display
- `d2f2f84` - Integrate FlashList and enable native screens
- `82b884a` - Enhance Instagram module with navigation
- `00f9bf1` - Refactor transaction configuration and currency formatting
- `fcd8f2d` - BIG UPDATE: Refactor project structure
- `e124751` - Test push for Instagram module
- `b17c77b` - Refactor task dialogs and enhance UI consistency
- `151241a` - BIG UPDATE: Refactor screen organization

### September 2024
- `cdaa822` - Update react-native-worklets
- `35eeada` - Enhance AttachmentGallery and EditNoteScreen
- `60db899` - Refactor media handling in AttachmentGallery
- `f564af1` - Document-picker final implementation
- `3be2f3e` - Document-picker fix in wtregistry
- `a31ea2d` - Add serviceAccountKey.json to .gitignore
- `7915c6e` - Notes page fix part 3: Audio handling
- `af99bb7` - Notes page fix part 2: Media handling
- `c5a174e` - Notes page fix part 1
- `5677e48` - Enhance note management and media handling
- `d5d963c` - Implement attachment gallery in NotesScreen
- `123d463` - Add Notes feature with stack navigation
- `e99576a` - Implement comprehensive calendar and event management
- `13c9e64` - Refactor Chip components across screens
- `152b561` - Enhance calendar with remote event management
- `49ebf88` - Enhance balance management
- `591775e` - Refactor transaction screens
- `87adeb1` - Add lesson management functionality
- `588974b` - Implement month filtering in registration screen
- `70b53f5` - Update dependencies and enhance registration management
- `c90dff4` - Enhance file handling in registration

### August 2024
- Initial release with core functionality
- Transaction management system
- Investment portfolio tracking
- Wing Tsun registry management
- Backend integration
- Core UI components

---

## Migration Guide

### Upgrading to v2.0.0

1. **Install new dependencies**:
   ```bash
   npm install @tanstack/react-query nativewind
   ```

2. **Update babel.config.js**:
   ```javascript
   presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
   ```

3. **Update imports** to use new path aliases:
   ```typescript
   // Before
   import { Something } from '../../components/Something';

   // After
   import { Something } from '@shared/components/Something';
   ```

4. **Wrap app with QueryClientProvider**:
   ```typescript
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

   const queryClient = new QueryClient();

   <QueryClientProvider client={queryClient}>
     <App />
   </QueryClientProvider>
   ```

---

**Note**: This changelog is auto-generated from git history and may be updated as new features are added.
