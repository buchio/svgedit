# SVG-Edit アーキテクチャ解説

## 目次

1. [概要](#概要)
2. [プロジェクト構造](#プロジェクト構造)
3. [システムアーキテクチャ](#システムアーキテクチャ)
4. [コアモジュール詳細](#コアモジュール詳細)
5. [UIレイヤー](#uiレイヤー)
6. [拡張機能システム](#拡張機能システム)
7. [状態管理](#状態管理)
8. [イベントシステム](#イベントシステム)
9. [データフロー](#データフロー)
10. [ビルドシステム](#ビルドシステム)

---

## 概要

SVG-Editは、ブラウザベースのベクターグラフィックエディタです。HTML5、JavaScript、SVGを活用し、プラグインによる拡張が可能な設計となっています。

### 主要な技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Vanilla JavaScript (ES Modules) |
| UI コンポーネント | Web Components (Custom Elements) |
| UIライブラリ | Elix |
| ビルドツール | Vite 7.x |
| テスト | Vitest + Playwright |
| 国際化 | i18next |
| PDF出力 | jsPDF + svg2pdf.js |

### アーキテクチャの特徴

```mermaid
graph TB
    subgraph Design[設計原則]
        A[モジュラー設計] --> B[関心の分離]
        B --> C[拡張可能性]
        C --> D[再利用性]
    end

    subgraph Implementation[実装パターン]
        E[Web Components] --> F[Shadow DOM]
        G[イベント駆動] --> H[Pub-Sub パターン]
        I[Command パターン] --> J[Undo-Redo]
    end
```

---

## プロジェクト構造

### ディレクトリ構成

```
svgedit/
├── packages/                    # ワークスペースパッケージ
│   ├── svgcanvas/              # コアキャンバスライブラリ
│   │   ├── core/               # コア機能モジュール (33個)
│   │   ├── common/             # 共有ユーティリティ
│   │   └── svgcanvas.js        # エントリーポイント
│   └── react-test/             # React統合テスト
│
├── src/editor/                  # エディタUI
│   ├── components/             # UIコンポーネント (22個)
│   ├── dialogs/                # ダイアログ (20個)
│   ├── extensions/             # 拡張機能 (12個)
│   ├── panels/                 # パネル (4個)
│   ├── locale/                 # 多言語ファイル (30+言語)
│   ├── images/                 # アイコン・カーソル
│   ├── Editor.js               # メインエディタクラス
│   ├── EditorStartup.js        # 起動処理
│   └── ConfigObj.js            # 設定管理
│
├── tests/                       # テストスイート
│   ├── unit/                   # ユニットテスト (Vitest)
│   └── e2e/                    # E2Eテスト (Playwright)
│
├── scripts/                     # ビルドスクリプト
├── docs/                        # ドキュメント
└── vite.config.mjs             # Vite設定
```

### パッケージ依存関係

```mermaid
graph LR
    subgraph NPM_Workspace[NPM Workspace]
        A["svgedit<br/>ルートパッケージ"]
        B["svgcanvas<br/>コアライブラリ"]
        C["react-test<br/>React統合"]
    end

    A --> B
    C --> B

    subgraph External[外部依存]
        D["elix"]
        E["i18next"]
        F["jspdf"]
        G["browser-fs-access"]
    end

    A --> D
    A --> E
    A --> F
    A --> G
```

---

## システムアーキテクチャ

### 全体構成図

```mermaid
graph TB
    subgraph Browser[ブラウザ]
        subgraph Presentation[プレゼンテーション層]
            UI[UI Components]
            Panels[Panels]
            Dialogs[Dialogs]
            Menu[Main Menu]
        end

        subgraph Application[アプリケーション層]
            Editor[Editor.js]
            Startup[EditorStartup.js]
            Config[ConfigObj.js]
        end

        subgraph Domain[ドメイン層]
            Canvas[SvgCanvas]
            Drawing[Drawing]
            History[UndoManager]
            Selection[SelectorManager]
        end

        subgraph Extensions[拡張機能層]
            Ext1[ext-opensave]
            Ext2[ext-grid]
            Ext3[ext-shapes]
            ExtN[...]
        end

        subgraph Infra[インフラ層]
            DOM[SVG DOM]
            Storage[LocalStorage]
            FS[File System API]
        end
    end

    UI --> Editor
    Panels --> Editor
    Dialogs --> Editor
    Menu --> Editor

    Editor --> Canvas
    Startup --> Canvas
    Config --> Editor

    Canvas --> Drawing
    Canvas --> History
    Canvas --> Selection

    Ext1 --> Canvas
    Ext2 --> Canvas
    Ext3 --> Canvas

    Drawing --> DOM
    Canvas --> Storage
    Ext1 --> FS
```

### レイヤー構成

```mermaid
graph TB
    subgraph Layer1[Layer 1 - UI]
        L1["Web Components<br/>se-button, se-input, etc."]
    end

    subgraph Layer2[Layer 2 - Presentation]
        L2["Panels and Dialogs<br/>TopPanel, LeftPanel, etc."]
    end

    subgraph Layer3[Layer 3 - Application]
        L3["Editor<br/>統合・調整"]
    end

    subgraph Layer4[Layer 4 - Domain]
        L4["SvgCanvas<br/>SVG操作エンジン"]
    end

    subgraph Layer5[Layer 5 - Infrastructure]
        L5["DOM API, File API, Storage API"]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
```

---

## コアモジュール詳細

### SvgCanvas モジュール構成

```mermaid
graph TB
    subgraph SvgCanvasPkg[packages/svgcanvas/]
        Main["svgcanvas.js<br/>エントリーポイント"]

        subgraph Core[core/]
            subgraph Drawing[描画系]
                Draw["draw.js<br/>描画エンジン"]
                Paint["paint.js<br/>塗りスタイル"]
                Blur["blur-event.js<br/>ブラー効果"]
            end

            subgraph PathEdit[パス編集系]
                Path["path.js<br/>パス操作"]
                PathMethod["path-method.js<br/>パスメソッド"]
                PathActions["path-actions.js<br/>パスアクション"]
            end

            subgraph ElemOps[要素操作系]
                ElemGetSet["elem-get-set.js<br/>要素取得・設定"]
                SelectedElem["selected-elem.js<br/>選択要素操作"]
                CopyElem["copy-elem.js<br/>コピー"]
                PasteElem["paste-elem.js<br/>ペースト"]
            end

            subgraph SelectSys[選択系]
                Select["select.js<br/>選択ボックス"]
                Selection["selection.js<br/>選択管理"]
            end

            subgraph HistorySys[履歴系]
                History["history.js<br/>履歴管理"]
                HistoryRec["historyrecording.js<br/>履歴記録"]
                Undo["undo.js<br/>Undo機能"]
            end

            subgraph Geometry[幾何計算系]
                Coords["coords.js<br/>座標処理"]
                Math["math.js<br/>数学関数"]
                Recalc["recalculate.js<br/>再計算"]
                Units["units.js<br/>単位変換"]
            end

            subgraph EventSys[イベント系]
                Event["event.js<br/>イベントハンドラ"]
                Touch["touch.js<br/>タッチイベント"]
            end

            subgraph Others[その他]
                Utils["utilities.js<br/>ユーティリティ"]
                Sanitize["sanitize.js<br/>サニタイズ"]
                Layer["layer.js<br/>レイヤー"]
                TextActions["text-actions.js<br/>テキスト操作"]
                SvgExec["svg-exec.js<br/>SVG実行"]
            end
        end
    end

    Main --> Draw
    Main --> Path
    Main --> ElemGetSet
    Main --> Select
    Main --> History
    Main --> Event
    Main --> Utils
```

### 主要クラスの関係

```mermaid
classDiagram
    class SvgCanvas {
        +svgroot: SVGElement
        +svgContent: SVGElement
        +currentMode: string
        +selectedElements: Element[]
        +zoom: number
        +extensions: Object
        +setMode(mode)
        +getSelectedElements()
        +addSVGElementsFromJson(json)
        +call(event, arg)
        +bind(event, handler)
    }

    class Drawing {
        +svgElem_: SVGElement
        +all_layers: Layer[]
        +current_layer: Layer
        +getNonce()
        +createLayer(name)
        +deleteCurrentLayer()
        +setCurrentLayer(name)
    }

    class Layer {
        +name_: string
        +group_: SVGGElement
        +getName()
        +getGroup()
        +activate()
        +deactivate()
        +setVisible(visible)
    }

    class Selector {
        +selectedElement: Element
        +selectorGroup: SVGGElement
        +selectorRect: SVGPathElement
        +gripCoords: Object
        +reset(elem, bbox)
        +resize(bbox)
        +showGrips(show)
    }

    class SelectorManager {
        +selectorParentGroup: SVGGElement
        +selectors: Selector[]
        +requestSelector(elem)
        +releaseSelector(elem)
    }

    class UndoManager {
        +undoStack: Command[]
        +redoStack: Command[]
        +addCommandToHistory(cmd)
        +undo()
        +redo()
    }

    class Paint {
        +type: string
        +alpha: number
        +solidColor: string
        +linearGradient: SVGElement
        +radialGradient: SVGElement
    }

    SvgCanvas --> Drawing
    SvgCanvas --> SelectorManager
    SvgCanvas --> UndoManager
    Drawing --> Layer
    SelectorManager --> Selector
    SvgCanvas --> Paint
```

### コアモジュールのファイルサイズ

```mermaid
pie title コアモジュール サイズ分布 (KB)
    "event.js" : 48.1
    "utilities.js" : 45.6
    "svg-exec.js" : 41.2
    "selected-elem.js" : 41.2
    "elem-get-set.js" : 36.1
    "path-actions.js" : 36.8
    "draw.js" : 35.2
    "path-method.js" : 25.3
    "その他" : 100
```

---

## UIレイヤー

### コンポーネント構成

```mermaid
graph TB
    subgraph WebComponents[Web Components]
        subgraph InputComponents[入力系]
            seButton["se-button<br/>ボタン"]
            seInput["se-input<br/>テキスト入力"]
            seSpinInput["se-spin-input<br/>数値入力"]
            seSelect["se-select<br/>セレクト"]
        end

        subgraph DisplayComponents[表示系]
            seText["se-text<br/>テキスト表示"]
            seList["se-list<br/>リスト"]
            sePalette["se-palette<br/>パレット"]
        end

        subgraph CompositeComponents[複合系]
            seMenu["se-menu<br/>メニュー"]
            seFlyingButton["se-flyingbutton<br/>展開ボタン"]
            seColorPicker["se-colorpicker<br/>色選択"]
            seZoom["se-zoom<br/>ズーム制御"]
        end
    end

    subgraph ElixComponents[Elix ベースコンポーネント]
        ElixInput["elix Input"]
        ElixMenuItem["elix MenuItem"]
        ElixDialog["elix Dialog"]
        NumberSpinBox["NumberSpinBox"]
    end

    seInput --> ElixInput
    seMenu --> ElixMenuItem
    seSpinInput --> NumberSpinBox
```

### パネルレイアウト

```mermaid
graph TB
    subgraph CSSGrid[CSS Grid Layout]
        subgraph Row1[Row 1]
            TopPanel["TopPanel<br/>ツールバー・コントロール"]
        end

        subgraph Row2_3[Row 2-3]
            LeftPanel["LeftPanel<br/>ツール選択"]
            RulerX["Ruler X"]
            RulerY["Ruler Y"]
            Workarea["Workarea<br/>キャンバス領域"]
            SidePanel["LayersPanel<br/>レイヤー管理"]
        end

        subgraph Row4[Row 4]
            BottomPanel["BottomPanel<br/>色・ストローク設定"]
        end
    end
```

### グリッドテンプレート

```
┌────────────────────────────────────────────────────────┐
│                    TopPanel (main, top)                 │
├─────┬────────┬────────────────────────────┬────────────┤
│     │ corner │        Ruler X             │            │
│ L   ├────────┼────────────────────────────┤   Side     │
│ e   │        │                            │   Panel    │
│ f   │ Ruler  │       Workarea             │   (layers) │
│ t   │   Y    │       (canvas)             │            │
│     │        │                            │            │
├─────┴────────┴────────────────────────────┴────────────┤
│                    BottomPanel                          │
└────────────────────────────────────────────────────────┘
```

### ダイアログシステム

```mermaid
graph LR
    subgraph BasicDialogs[基本ダイアログ]
        Alert["seAlertDialog"]
        Confirm["seConfirmDialog"]
        Prompt["sePromptDialog"]
        Select["seSelectDialog"]
    end

    subgraph FuncDialogs[機能ダイアログ]
        Prefs["editorPreferencesDialog<br/>設定"]
        Export["exportDialog<br/>エクスポート"]
        ImgProps["imagePropertiesDialog<br/>画像プロパティ"]
        SvgSrc["svgSourceDialog<br/>SVGソース"]
    end

    subgraph ContextMenus[コンテキストメニュー]
        CMenu["cmenuDialog<br/>キャンバス"]
        CMenuLayers["cmenuLayersDialog<br/>レイヤー"]
    end
```

---

## 拡張機能システム

### 拡張機能アーキテクチャ

```mermaid
graph TB
    subgraph LoadFlow[拡張機能ロードフロー]
        A["EditorStartup.extAndLocaleFunc"] --> B{"設定から拡張機能リスト取得"}
        B --> C["Promise.all で並列ロード"]
        C --> D["動的 import"]
        D --> E["init 関数呼び出し"]
        E --> F["svgCanvas.addExtension"]
        F --> G["extensions_added イベント発火"]
    end

    subgraph ExtStructure[拡張機能構造]
        H["ext-name/"]
        H --> I["ext-name.js<br/>メイン実装"]
        H --> J["locale/<br/>翻訳ファイル"]
    end
```

### 標準拡張機能一覧

```mermaid
graph TB
    subgraph DrawTools[描画ツール系]
        Shapes["ext-shapes<br/>図形ライブラリ"]
        Polystar["ext-polystar<br/>多角形・星形"]
        Connector["ext-connector<br/>接続線"]
    end

    subgraph EditHelpers[編集補助系]
        Eyedropper["ext-eyedropper<br/>スポイト"]
        Grid["ext-grid<br/>グリッド表示"]
        Markers["ext-markers<br/>矢印マーカー"]
    end

    subgraph FileOps[ファイル操作系]
        OpenSave["ext-opensave<br/>開く 保存"]
        Storage["ext-storage<br/>ローカルストレージ"]
    end

    subgraph ViewControl[表示制御系]
        Panning["ext-panning<br/>パンニング"]
        LayerView["ext-layer_view<br/>レイヤービュー"]
        Overview["ext-overview_window<br/>概要ウィンドウ"]
    end
```

### 拡張機能インターフェース

```mermaid
classDiagram
    class ExtensionModule {
        +name: string
        +init(S): Promise~ExtensionResponse~
    }

    class ExtensionResponse {
        +callback(): void
        +mouseDown(opts): Object
        +mouseMove(opts): void
        +mouseUp(opts): void
        +selectedChanged(opts): void
        +elementChanged(opts): void
        +zoomChanged(zoom): void
        +layersChanged(): void
    }

    class ExtensionArgument {
        +importLocale: Function
        +svgroot: SVGElement
        +svgContent: SVGElement
        +nonce: string
        +selectorManager: SelectorManager
    }

    ExtensionModule ..> ExtensionResponse : returns
    ExtensionModule ..> ExtensionArgument : receives
```

### 拡張機能ライフサイクル

```mermaid
sequenceDiagram
    participant E as Editor
    participant C as ConfigObj
    participant S as SvgCanvas
    participant X as Extension

    E->>C: curConfig.extensions取得
    C-->>E: 拡張機能リスト

    loop 各拡張機能
        E->>X: import(ext-name.js)
        X-->>E: { name, init }
        E->>S: addExtension(name, init)
        S->>X: init(argObj)
        X-->>S: ExtensionResponse
        S->>S: extensions[name] = response
        S->>E: call('extension_added')
    end

    S->>E: call('extensions_added')
```

---

## 状態管理

### 状態の階層構造

```mermaid
graph TB
    subgraph GlobalState[グローバル状態]
        ConfigObj["ConfigObj<br/>設定・プリファレンス"]
    end

    subgraph EditorState[エディタ状態]
        Editor["Editor<br/>selectedElement<br/>multiselected"]
    end

    subgraph CanvasState[キャンバス状態]
        SvgCanvas["SvgCanvas"]
        SvgCanvas --> Mode["currentMode<br/>エディタモード"]
        SvgCanvas --> Selected["selectedElements<br/>選択要素"]
        SvgCanvas --> Zoom["zoom<br/>ズームレベル"]
        SvgCanvas --> Style["curShape/curText<br/>スタイル"]
    end

    subgraph DocState[ドキュメント状態]
        Drawing["Drawing"]
        Drawing --> Layers["all_layers<br/>レイヤー配列"]
        Drawing --> CurrentLayer["current_layer<br/>現在レイヤー"]
    end

    subgraph HistoryState[履歴状態]
        UndoManager["UndoManager"]
        UndoManager --> UndoStack["undoStack"]
        UndoManager --> RedoStack["redoStack"]
    end

    ConfigObj --> Editor
    Editor --> SvgCanvas
    SvgCanvas --> Drawing
    SvgCanvas --> UndoManager
```

### 状態変更フロー

```mermaid
sequenceDiagram
    participant U as User
    participant E as Event Handler
    participant S as SvgCanvas
    participant D as DOM
    participant H as UndoManager
    participant Ed as Editor
    participant UI as UI Panel

    U->>E: マウスクリック
    E->>S: getMouseTarget()
    S->>S: addToSelection(elem)
    S->>D: 選択ボックス表示
    S->>Ed: call('selected', elements)
    Ed->>UI: selectedChanged()
    UI->>UI: パネル更新
```

### Undo/Redo システム

```mermaid
graph LR
    subgraph CommandPattern[Command パターン]
        A["ユーザー操作"] --> B["Command 生成"]
        B --> C["execute"]
        C --> D["addCommandToHistory"]
    end

    subgraph HistoryMgmt[履歴管理]
        D --> E["undoStack に push"]
        F["undo 呼び出し"] --> G["undoStack から pop"]
        G --> H["unapply"]
        H --> I["redoStack に push"]
        J["redo 呼び出し"] --> K["redoStack から pop"]
        K --> L["apply"]
        L --> E
    end
```

### Command クラス階層

```mermaid
classDiagram
    class Command {
        <<interface>>
        +apply()
        +unapply()
        +elements(): Element[]
        +type(): string
    }

    class InsertElementCommand {
        +elem: Element
        +parent: Element
        +apply()
        +unapply()
    }

    class RemoveElementCommand {
        +elem: Element
        +parent: Element
        +apply()
        +unapply()
    }

    class ChangeElementCommand {
        +elem: Element
        +attrs: Object
        +apply()
        +unapply()
    }

    class MoveElementCommand {
        +elem: Element
        +oldParent: Element
        +newParent: Element
        +apply()
        +unapply()
    }

    class BatchCommand {
        +text: string
        +stack: Command[]
        +addSubCommand(cmd)
        +apply()
        +unapply()
    }

    Command <|-- InsertElementCommand
    Command <|-- RemoveElementCommand
    Command <|-- ChangeElementCommand
    Command <|-- MoveElementCommand
    Command <|-- BatchCommand
    BatchCommand o-- Command
```

---

## イベントシステム

### イベントフロー概要

```mermaid
graph TB
    subgraph DOMEvents[DOM イベント]
        Mouse["mousedown/move/up"]
        Key["keydown/keyup"]
        Touch["touchstart/move/end"]
    end

    subgraph CanvasHandlers[SvgCanvas イベントハンドラ]
        MouseHandler["mouseDownEvent<br/>mouseMoveEvent<br/>mouseUpEvent"]
        KeyHandler["キーボードハンドラ"]
    end

    subgraph CustomEvents[カスタムイベント]
        Selected["selected"]
        Changed["changed"]
        Transition["transition"]
        Zoomed["zoomed"]
        ExtAdded["extension_added"]
    end

    subgraph Listeners[リスナー]
        Editor["Editor"]
        Extensions["Extensions"]
        Panels["Panels"]
    end

    Mouse --> MouseHandler
    Key --> KeyHandler
    Touch --> MouseHandler

    MouseHandler --> Selected
    MouseHandler --> Changed
    MouseHandler --> Transition

    Selected --> Editor
    Selected --> Extensions
    Changed --> Editor
    Changed --> Panels
    Zoomed --> Extensions
```

### 主要イベント一覧

```mermaid
graph LR
    subgraph SelectEvents[選択関連]
        E1["selected<br/>選択変更時"]
        E2["transition<br/>変形中"]
    end

    subgraph ChangeEvents[変更関連]
        E3["changed<br/>要素変更完了"]
        E4["contextset<br/>グループ内編集"]
    end

    subgraph ViewEvents[表示関連]
        E5["zoomed<br/>ズーム変更"]
        E6["modeChange<br/>モード変更"]
    end

    subgraph ExtEvents[拡張機能関連]
        E7["extension_added<br/>拡張追加"]
        E8["extensions_added<br/>全拡張ロード完了"]
    end

    subgraph DocEvents[ドキュメント関連]
        E9["beforeClear<br/>クリア前"]
        E10["afterClear<br/>クリア後"]
    end
```

### イベント発火シーケンス（要素選択）

```mermaid
sequenceDiagram
    participant U as User
    participant DOM as SVG DOM
    participant E as event.js
    participant Sel as selection.js
    participant SM as SelectorManager
    participant Ed as Editor
    participant TP as TopPanel
    participant Ext as Extensions

    U->>DOM: click
    DOM->>E: mousedown event
    E->>E: getMouseTarget()
    E->>Sel: addToSelection(elem)
    Sel->>SM: requestSelector(elem)
    SM->>SM: セレクタ表示
    Sel->>Ed: call('selected', elements)

    par 並列処理
        Ed->>TP: selectedChanged()
        TP->>TP: updateContextPanel()
    and
        Ed->>Ext: selectedChanged()
    end
```

### イベント発火シーケンス（図形描画）

```mermaid
sequenceDiagram
    participant U as User
    participant E as event.js
    participant S as SvgCanvas
    participant D as draw.js
    participant H as history.js
    participant Ed as Editor

    U->>E: mousedown (開始点)
    E->>S: getMode() = 'rect'
    E->>D: 矩形要素作成
    D->>D: started = true

    loop ドラッグ中
        U->>E: mousemove
        E->>D: 矩形サイズ更新
    end

    U->>E: mouseup (終了点)
    E->>D: 要素確定
    D->>S: addToSelection(rect)
    D->>H: InsertElementCommand
    H->>H: addCommandToHistory
    S->>Ed: call('changed', [rect])
    Ed->>Ed: elementChanged()
```

---

## データフロー

### SVG 読み込みフロー

```mermaid
sequenceDiagram
    participant U as User
    participant OS as ext-opensave
    participant Ed as Editor
    participant S as SvgCanvas
    participant San as sanitize.js
    participant D as Drawing

    U->>OS: ファイル選択
    OS->>OS: FileReader.readAsText()
    OS->>Ed: loadSvgString(svgStr)
    Ed->>S: setSvgString(svgStr)
    S->>San: sanitizeSvg(svgStr)
    San-->>S: 安全なSVG
    S->>D: Drawing 初期化
    D->>D: レイヤー解析
    S->>S: call('changed')
    S->>Ed: call('extensions_added')
```

### SVG 保存フロー

```mermaid
sequenceDiagram
    participant U as User
    participant OS as ext-opensave
    participant S as SvgCanvas
    participant Exec as svg-exec.js
    participant FS as File System API

    U->>OS: 保存ボタン
    OS->>S: getSvgString()
    S->>Exec: svgCanvasToString()
    Exec->>Exec: XML シリアライズ
    Exec-->>S: SVG 文字列
    S-->>OS: SVG データ
    OS->>FS: fileSave(blob)
    FS-->>U: ファイル保存
```

### PDF エクスポートフロー

```mermaid
sequenceDiagram
    participant U as User
    participant Exp as exportDialog
    participant S as SvgCanvas
    participant PDF as jsPDF
    participant S2P as svg2pdf.js

    U->>Exp: PDF エクスポート選択
    Exp->>S: getSvgString()
    S-->>Exp: SVG データ
    Exp->>PDF: new jsPDF()
    Exp->>S2P: svg2pdf(svg, pdf)
    S2P->>PDF: PDF 生成
    PDF-->>Exp: PDF Blob
    Exp->>U: ダウンロード
```

### 要素変更のデータフロー

```mermaid
graph LR
    subgraph Input[入力]
        A["UI 操作"] --> B["イベントハンドラ"]
    end

    subgraph Process[処理]
        B --> C["SvgCanvas メソッド"]
        C --> D["DOM 更新"]
        D --> E["Command 生成"]
        E --> F["履歴に追加"]
    end

    subgraph Output[出力]
        F --> G["イベント発火"]
        G --> H["UI 更新"]
        G --> I["拡張機能通知"]
    end
```

---

## ビルドシステム

### ビルドプロセス

```mermaid
graph TB
    subgraph BuildProcess[npm run build]
        A["開始"] --> B["svgcanvas ビルド"]
        B --> C["react-test ビルド"]
        C --> D["エディタビルド"]
        D --> E["拡張機能ビルド"]
        E --> F["静的アセットコピー"]
        F --> G["完了"]
    end

    subgraph BuildOutput[出力]
        D --> H["dist/editor/Editor.js<br/>ES Module"]
        D --> I["dist/editor/iife-Editor.js<br/>IIFE バンドル"]
        E --> J["dist/editor/extensions/"]
        F --> K["HTML, CSS, 画像"]
    end
```

### Vite 設定概要

```mermaid
graph LR
    subgraph ViteConfig[ルート vite.config.mjs]
        A["MPA 設定"] --> B["複数エントリー"]
        B --> C["index.html"]
        B --> D["iife-index.html"]
        B --> E["xdomain-index.html"]

        F["ライブラリビルド"] --> G["ES Module"]
        F --> H["IIFE"]

        I["プラグイン"]
        I --> J["htmlStringPlugin"]
        I --> K["dynamicImportVars"]
        I --> L["istanbul"]
    end
```

### テスト構成

```mermaid
graph TB
    subgraph TestSuite[テストスイート]
        A["npm run test"]
        A --> B["Vitest<br/>ユニットテスト"]
        A --> C["Playwright<br/>E2E テスト"]
    end

    subgraph VitestTests[Vitest]
        B --> D["tests/unit/*.test.js"]
        B --> E["カバレッジ計測"]
    end

    subgraph PlaywrightTests[Playwright]
        C --> F["tests/e2e/*.spec.js"]
        C --> G["ブラウザテスト"]
    end
```

---

## 開発ガイド

### 新規拡張機能の作成

```mermaid
graph TB
    A["ext-myextension/ 作成"] --> B["ext-myextension.js 作成"]
    B --> C["locale/ ディレクトリ作成"]
    C --> D["翻訳ファイル作成"]
    D --> E["ConfigObj に登録"]

    subgraph ExtImpl[実装内容]
        F["name エクスポート"]
        G["init 関数実装"]
        H["イベントハンドラ定義"]
        I["UI コールバック"]
    end

    B --> F
    B --> G
    G --> H
    G --> I
```

### 拡張機能テンプレート

```javascript
// ext-myextension.js
const name = 'myextension'

export default {
  name,
  async init(S) {
    const svgEditor = this
    const { svgCanvas } = svgEditor

    return {
      callback() {
        // UI 初期化
      },
      mouseDown(opts) {
        // マウスダウン処理
      },
      mouseUp(opts) {
        // マウスアップ処理
      },
      selectedChanged(opts) {
        // 選択変更時
      }
    }
  }
}
```

### コンポーネント作成パターン

```mermaid
graph TB
    A[HTMLElement 継承] --> B[Shadow DOM 作成]
    B --> C[テンプレート定義]
    C --> D[observedAttributes 定義]
    D --> E[attributeChangedCallback 実装]
    E --> F[connectedCallback 実装]
    F --> G[customElements.define 登録]
```

---

## パフォーマンス考慮事項

### 最適化ポイント

```mermaid
graph TB
    subgraph RenderOpt[レンダリング最適化]
        A["requestAnimationFrame 使用"]
        B["バッチ DOM 更新"]
        C["仮想化リスト"]
    end

    subgraph MemoryOpt[メモリ最適化]
        D["イベントリスナー解除"]
        E["不要な参照クリア"]
        F["履歴サイズ制限"]
    end

    subgraph CalcOpt[計算最適化]
        G["座標計算キャッシュ"]
        H["BBox 計算最小化"]
        I["変換行列再利用"]
    end
```

---

## セキュリティ考慮事項

### SVG サニタイズ

```mermaid
graph LR
    A["外部 SVG"] --> B["sanitize.js"]
    B --> C{"危険な要素チェック"}
    C -->|script タグ| D["削除"]
    C -->|イベント属性| E["削除"]
    C -->|外部参照| F["削除"]
    C -->|安全| G["許可"]
    D --> H["安全な SVG"]
    E --> H
    F --> H
    G --> H
```

### 許可される要素・属性

- **許可要素**: svg, g, rect, circle, ellipse, line, polyline, polygon, path, text, tspan, image, use, defs, clipPath, mask, pattern, linearGradient, radialGradient, stop, etc.
- **禁止要素**: script, foreignObject (条件付き)
- **禁止属性**: on* イベントハンドラ

---

## 用語集

| 用語 | 説明 |
|------|------|
| SvgCanvas | SVG 操作のコアエンジン |
| Drawing | SVG ドキュメント構造を管理するクラス |
| Layer | SVG グループ要素をラップしたレイヤークラス |
| Selector | 選択ボックスを描画・管理するクラス |
| Paint | 塗りスタイル（単色/グラデーション）を抽象化 |
| Command | Undo/Redo 用の操作コマンド |
| Extension | プラグイン形式の拡張機能 |
| Mode | エディタの現在の操作モード（select, rect, path 等） |

---

## 参考リンク

- [SVG-Edit GitHub](https://github.com/SVG-Edit/svgedit)
- [SVG 仕様](https://www.w3.org/TR/SVG2/)
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Elix](https://component.kitchen/elix)
- [Vite](https://vitejs.dev/)
