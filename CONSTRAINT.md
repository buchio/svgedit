# SVG-Edit 拡張機能の制約と限界

このドキュメントでは、SVG-Edit の拡張機能（Extension）システムでできることとできないことを詳細に解説します。

## 目次

1. [概要](#概要)
2. [できること](#できること)
3. [できないこと](#できないこと)
4. [API アクセスの制約](#api-アクセスの制約)
5. [イベントシステムの制約](#イベントシステムの制約)
6. [UI 変更の制約](#ui-変更の制約)
7. [DOM 操作の制約](#dom-操作の制約)
8. [拡張機能間の相互作用](#拡張機能間の相互作用)
9. [セキュリティ制限](#セキュリティ制限)
10. [パフォーマンス制約](#パフォーマンス制約)
11. [ベストプラクティス](#ベストプラクティス)

---

## 概要

SVG-Edit の拡張機能システムは、エディタの機能を拡張するための仕組みを提供しますが、エディタの安定性とセキュリティを保つために一定の制約があります。

### 拡張機能の基本原則

| 原則 | 説明 |
|------|------|
| 安定性優先 | コアエディタの動作を破壊しない |
| セキュリティ | XSS やインジェクション攻撃を防止 |
| 独立性 | 他の拡張機能に依存しない設計を推奨 |
| 限定的アクセス | 公開 API のみを使用 |

---

## できること

### 1. 新規描画ツールの追加

```javascript
// 新しい描画モードを追加
svgCanvas.setMode('my-custom-mode')

// マウスイベントで図形を描画
mouseDown(opts) {
  const elem = svgCanvas.addSVGElementsFromJson({
    element: 'rect',
    attr: { x: opts.start_x, y: opts.start_y, width: 1, height: 1 }
  })
  return { started: true, element: elem }
}
```

**可能な操作:**
- カスタム描画モードの定義
- 任意の SVG 要素の作成（rect, circle, path, polygon など）
- マウスドラッグによるインタラクティブな描画
- 描画完了時の要素確定

### 2. UI コンポーネントの追加

```javascript
// 左パネルにボタンを追加
callback() {
  const template = document.createElement('template')
  template.innerHTML = `
    <se-button id="my_tool" title="My Tool" src="my_icon.svg"></se-button>
  `
  $id('tools_left').append(template.content.cloneNode(true))
}
```

**追加可能な場所:**
- 左パネル（`tools_left`）- ツールボタン
- トップパネル（`tools_top`）- コンテキストパネル
- ワークエリア（`workarea`）- 補助要素、オーバーレイ

### 3. 選択要素の操作

```javascript
// 選択要素の属性を変更
selectedChanged(opts) {
  const elem = opts.selectedElement
  if (elem) {
    svgCanvas.changeSelectedAttribute('fill', '#ff0000')
    svgCanvas.changeSelectedAttribute('stroke-width', '2')
  }
}
```

**可能な操作:**
- 選択要素の属性取得・変更
- 選択要素の変形（移動、回転、スケール）
- 選択要素の削除・複製
- 複数要素の一括操作

### 4. レイヤー操作

```javascript
// レイヤーの作成と管理
svgCanvas.createLayer('New Layer')
svgCanvas.setCurrentLayer('Layer 1')
svgCanvas.deleteCurrentLayer()
svgCanvas.moveSelectedToLayer('Target Layer')
svgCanvas.mergeLayer()
```

**可能な操作:**
- レイヤーの作成・削除・名前変更
- 現在レイヤーの切り替え
- 要素のレイヤー間移動
- レイヤーの可視性制御
- レイヤーのマージ

### 5. Undo/Redo 対応の操作

```javascript
// Undo 履歴に記録される操作
svgCanvas.changeSelectedAttribute('fill', '#00ff00')  // Undo 対応

// Undo 履歴に記録されない操作
svgCanvas.changeSelectedAttributeNoUndo('fill', '#00ff00')  // Undo 非対応
```

**可能な操作:**
- 属性変更のUndo対応
- バッチコマンドの作成
- カスタムコマンドの履歴登録

### 6. SVG 要素の作成と操作

```javascript
// JSON から SVG 要素を作成
const newElem = svgCanvas.addSVGElementsFromJson({
  element: 'path',
  curStyles: true,
  attr: {
    d: 'M10,10 L50,50 L10,50 Z',
    id: svgCanvas.getNextId()
  }
})

// 要素の境界ボックス取得
const bbox = svgCanvas.getBBox(elem)

// 要素の変形
svgCanvas.recalculateDimensions(elem)
```

### 7. 国際化（多言語対応）

```javascript
// ロケールファイルの読み込み
const loadExtensionTranslation = async (svgEditor) => {
  const lang = svgEditor.configObj.pref('lang')
  const module = await import(`./locale/${lang}.js`)
  svgEditor.i18next.addResourceBundle(lang, name, module.default)
}

// 翻訳の使用
const text = svgEditor.i18next.t('myextension:button.title')
```

### 8. ファイル操作（ext-opensave 経由）

```javascript
// SVG の読み込み
svgEditor.loadFromString(svgString)
svgEditor.loadFromURL(url)

// SVG の取得
const svgString = svgCanvas.getSvgString()
```

### 9. ズームとパン

```javascript
// ズームレベルの取得・設定
const zoom = svgCanvas.getZoom()
svgCanvas.setZoom(2.0)  // 200%

// ズーム変更イベントの処理
zoomChanged(zoom) {
  // ズームレベルに応じた処理
}
```

### 10. グラデーションとフィルター

```javascript
// defs 要素の取得
const defs = svgCanvas.findDefs()

// グラデーションの作成
const gradient = document.createElementNS(NS.SVG, 'linearGradient')
gradient.id = svgCanvas.getNextId()
defs.appendChild(gradient)
```

---

## できないこと

### 1. コアイベントのキャンセル

```javascript
// できない: イベントの中断やキャンセル
mouseDown(opts) {
  // この戻り値は参考値のみ
  // イベント自体をキャンセルすることはできない
  return { cancel: true }  // 効果なし
}
```

**制限:**
- `preventDefault()` は機能しない
- `stopPropagation()` は機能しない
- 編集操作を中断することはできない

### 2. 拡張機能の実行順序制御

```javascript
// できない: 実行順序の指定
export default {
  name: 'my-extension',
  priority: 100,  // このような優先度指定はない
  init() { ... }
}
```

**制限:**
- 拡張機能は登録順に実行される
- 他の拡張機能より先に実行することを保証できない
- 最後の拡張機能の戻り値が使用される場合がある

### 3. プライベートメソッドへのアクセス

```javascript
// できない: 内部イベントハンドラの直接呼び出し
svgCanvas.mouseDownEvent(e)  // 非公開メソッド
svgCanvas.mouseMoveEvent(e)  // 非公開メソッド
```

**アクセス不可のメソッド:**
- `mouseDownEvent()`, `mouseMoveEvent()`, `mouseUpEvent()`
- `dblClickEvent()`, `DOMMouseScrollEvent()`
- 各モジュールの内部実装メソッド

### 4. 内部状態の直接変更

```javascript
// できない: プライベート変数の直接変更
svgCanvas.started = true  // getter/setter を使用すべき
svgCanvas.currentMode = 'rect'  // setMode() を使用すべき
```

**直接アクセス不可の内部状態:**
- `started` - 描画開始フラグ
- `startTransform` - 変形開始状態
- `rubberBox` - 選択ボックス要素
- `curBBoxes` - 境界ボックスキャッシュ
- `lastClickPoint` - 最後のクリック位置

### 5. ボトムパネルへの UI 追加

```javascript
// できない/推奨されない: ボトムパネルへの追加
$id('tools_bottom').appendChild(myElement)  // 動作しない可能性
```

**UI追加不可の場所:**
- ボトムパネル（色選択、ストローク設定エリア）
- 既存ダイアログ内への埋め込み
- メインメニューバーへの直接追加

### 6. 既存イベントハンドラの上書き

```javascript
// できない: 既存のイベントバインディングを削除
svgCanvas.unbind('selected')  // このようなメソッドはない

// できない: イベントハンドラを置き換え
svgCanvas.events['selected'] = myHandler  // 破壊的
```

### 7. 他の拡張機能の強制ロード

```javascript
// できない: 他の拡張機能のロードを待機
await waitForExtension('other-extension')  // このようなAPIはない

// できない: 拡張機能の動的ロード
svgEditor.loadExtension('new-extension')  // 初期化時のみ
```

### 8. ネイティブファイルシステムへの直接アクセス

```javascript
// できない: ローカルファイルへの直接アクセス
const content = fs.readFileSync('/path/to/file')  // Node.js API は使用不可

// できない: 任意のパスへの保存
fs.writeFileSync('/path/to/file', data)  // 不可
```

**制限:**
- ファイルアクセスはブラウザの File API 経由のみ
- ユーザーが明示的に選択したファイルのみ
- ダウンロードフォルダへの保存のみ

### 9. クロスオリジンリソースの自由な取得

```javascript
// できない: CORS 制限のあるリソースへのアクセス
fetch('https://other-domain.com/data')  // CORS エラーの可能性

// できない: 外部スタイルシートの無制限読み込み
```

### 10. SVG DOM の直接 innerHTML 操作

```javascript
// できない/危険: svgContent の innerHTML を直接操作
svgCanvas.svgContent.innerHTML = newSvgString  // 状態が破壊される

// 代わりに使用すべき
svgCanvas.setSvgString(newSvgString)  // 適切なサニタイズと状態更新
```

---

## API アクセスの制約

### アクセス可能な API

| カテゴリ | メソッド例 | 説明 |
|---------|-----------|------|
| 要素作成 | `addSVGElementsFromJson()` | JSON から SVG 要素を作成 |
| 要素取得 | `getElement()`, `getSelectedElements()` | ID や選択状態で要素取得 |
| 属性操作 | `changeSelectedAttribute()` | 選択要素の属性変更 |
| 変形 | `recalculateDimensions()` | 要素サイズの再計算 |
| レイヤー | `createLayer()`, `setCurrentLayer()` | レイヤー操作 |
| 履歴 | `undoMgr.undo()`, `undoMgr.redo()` | Undo/Redo |
| 参照 | `findDefs()`, `getRefElem()` | defs や参照要素の取得 |
| ユーティリティ | `$id()`, `$click()`, `encode64()` | DOM 操作補助 |

### アクセス制限のある API

| カテゴリ | 制限内容 |
|---------|---------|
| イベントハンドラ | 内部イベントハンドラは呼び出し不可 |
| セレクタ管理 | `selectorManager` の内部メソッドは限定的 |
| パスアクション | `pathActions` の一部メソッドのみ公開 |
| テキストアクション | `textActions` の一部メソッドのみ公開 |

### getter/setter パターン

```javascript
// 推奨: getter/setter を使用
const started = svgCanvas.getStarted()
svgCanvas.setStarted(true)

const mode = svgCanvas.getMode()
svgCanvas.setMode('select')

// 非推奨: 直接アクセス
svgCanvas.started = true  // 動作するが非推奨
```

---

## イベントシステムの制約

### 処理可能なイベント

```javascript
return {
  // マウスイベント
  mouseDown(opts) { },   // マウスボタン押下
  mouseMove(opts) { },   // マウス移動
  mouseUp(opts) { },     // マウスボタン解放

  // 変更イベント
  selectedChanged(opts) { },    // 選択変更
  elementChanged(opts) { },     // 要素変更
  elementTransition(opts) { },  // 要素変形中

  // 表示イベント
  zoomChanged(zoom) { },        // ズーム変更
  workareaResized() { },        // ワークエリアリサイズ

  // その他
  langReady() { },              // 言語準備完了
  langChanged() { },            // 言語変更
  IDsUpdated() { },             // ID 更新
  canvasUpdated() { },          // キャンバス更新
}
```

### イベントハンドラの戻り値

```javascript
// mouseDown の戻り値
mouseDown(opts) {
  return {
    started: true  // true: mouseUp を待機, false: 即時終了
  }
}

// mouseUp の戻り値
mouseUp(opts) {
  return {
    keep: true,        // 要素を保持するか
    element: elem,     // 処理した要素
    started: false     // 開始状態をリセット
  }
}

// 注意: これらの戻り値は「提案」であり、強制力はない
```

### イベント実行順序

```
1. DOM イベント発生
2. SvgCanvas 内部ハンドラ実行
3. 拡張機能のハンドラが登録順に実行
4. 最後のハンドラの戻り値が使用される（returnArray=false の場合）
```

**制約:**
- 実行順序は制御不可
- 前の拡張機能の処理結果を受け取れない
- イベントチェーンの中断は不可

---

## UI 変更の制約

### 追加可能な場所と方法

```
┌─────────────────────────────────────────────────────────┐
│  TopPanel (tools_top) - コンテキストパネル追加可能       │
├─────┬───────────────────────────────────────┬───────────┤
│     │                                       │           │
│  L  │                                       │  Side     │
│  e  │         Workarea                      │  Panel    │
│  f  │    オーバーレイ要素追加可能            │           │
│  t  │                                       │           │
│     │                                       │           │
├─────┴───────────────────────────────────────┴───────────┤
│  BottomPanel - 追加非推奨                                │
└─────────────────────────────────────────────────────────┘

tools_left: ツールボタン追加可能
```

### Web Components の使用

```javascript
// 推奨: 既存の Web Components を使用
<se-button id="my_tool" title="title" src="icon.svg"></se-button>
<se-spin-input id="my_input" label="Label" min="0" max="100"></se-spin-input>
<se-select id="my_select"></se-select>
<se-list id="my_list"></se-list>

// 可能: カスタム Web Components の定義
class MyComponent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
}
customElements.define('my-component', MyComponent)
```

### スタイリングの制約

```javascript
// 推奨: CSS カスタムプロパティを使用
element.style.setProperty('--my-color', '#ff0000')

// 推奨: クラスベースのスタイリング
element.classList.add('my-extension-active')

// 非推奨: インラインスタイルの直接設定
element.style.backgroundColor = 'red'  // 他のスタイルと競合の可能性
```

---

## DOM 操作の制約

### 許可される操作

```javascript
// 標準 DOM API
element.getAttribute('attr')
element.setAttribute('attr', value)
element.appendChild(child)
element.removeChild(child)
element.classList.add('class')

// SVG 名前空間を使用した要素作成
const rect = document.createElementNS(NS.SVG, 'rect')
svgCanvas.assignAttributes(rect, { x: 10, y: 10, width: 50, height: 50 })

// 提供されたユーティリティ
$id('element-id')           // getElementById
$click(element, handler)    // クリックハンドラ登録
```

### 禁止/危険な操作

```javascript
// 危険: svgContent の直接操作
svgCanvas.svgContent.innerHTML = '...'  // 状態破壊

// 危険: セレクタ要素の直接操作
document.querySelector('#selectorGrip_resize_nw').remove()  // UI 破壊

// 危険: イベントリスナーの削除
svgCanvas.container.removeEventListener('mousedown', ...)  // 機能破壊

// 危険: プロトタイプの変更
SVGElement.prototype.myMethod = function() { }  // グローバル汚染
```

### SVG 固有の制約

```javascript
// 必須: SVG 名前空間の使用
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

// 誤り: HTML として作成
const badCircle = document.createElement('circle')  // 動作しない

// 注意: 名前空間付き属性
element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url)
```

---

## 拡張機能間の相互作用

### 他の拡張機能へのアクセス

```javascript
// 可能: 他の拡張機能の参照
const extensions = svgCanvas.getExtensions()
const storageExt = extensions['storage']

// 可能: 公開メソッドの呼び出し（相手が公開している場合）
if (storageExt && storageExt.getData) {
  const data = storageExt.getData()
}
```

### 制約

```javascript
// できない: 依存関係の宣言
export default {
  name: 'my-extension',
  dependencies: ['other-extension'],  // このような機能はない
  init() { }
}

// できない: ロード順序の保証
// 拡張機能 A が拡張機能 B より先にロードされる保証はない

// できない: 拡張機能間のイベント通信（標準機能として）
svgCanvas.emit('custom-event', data)  // このような API はない
```

### 推奨パターン

```javascript
// パターン1: 存在確認してから使用
const otherExt = svgCanvas.getExtensions()['other-extension']
if (otherExt) {
  // 安全に使用
} else {
  // フォールバック処理
}

// パターン2: 公開 API の提供
export default {
  name: 'my-extension',
  init() {
    return {
      // 他の拡張機能が使用できる公開 API
      publicMethod() {
        return someData
      },

      // 内部メソッド（先頭に _ を付けて区別）
      _privateMethod() { }
    }
  }
}
```

---

## セキュリティ制限

### SVG サニタイズ

SVG-Edit は外部 SVG を読み込む際に自動的にサニタイズを行います。

**除去される要素:**
- `<script>` タグ
- `<foreignObject>`（条件付き）
- イベントハンドラ属性（`onclick`, `onload` など）

**除去される属性:**
- `javascript:` URL
- `data:` URL（一部）
- 外部リソースへの参照（条件付き）

```javascript
// 安全: setSvgString は自動的にサニタイズ
svgCanvas.setSvgString(untrustedSvgString)

// 危険: 直接 innerHTML を設定
svgCanvas.svgContent.innerHTML = untrustedSvgString  // XSS 脆弱性
```

### ファイルアクセス制限

```javascript
// ブラウザのセキュリティモデルに従う

// 可能: ユーザーが選択したファイルの読み込み
const input = document.createElement('input')
input.type = 'file'
input.accept = '.svg'
input.onchange = (e) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.onload = () => { /* 処理 */ }
  reader.readAsText(file)
}

// 可能: ダウンロードとして保存
const blob = new Blob([svgString], { type: 'image/svg+xml' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'drawing.svg'
a.click()
```

### 外部リソースの制限

```javascript
// CORS 制限あり
fetch('https://external-api.com/data')
  .then(response => response.json())
  .catch(error => {
    // CORS エラーの可能性
  })

// 画像の読み込みも CORS 制限あり
const img = new Image()
img.crossOrigin = 'anonymous'  // CORS 対応サーバーが必要
img.src = 'https://external-server.com/image.png'
```

### ローカルストレージ

```javascript
// 可能: 同一オリジンのストレージアクセス
localStorage.setItem('myExtension.setting', JSON.stringify(data))
const data = JSON.parse(localStorage.getItem('myExtension.setting'))

// 制限: ストレージ容量（通常 5-10MB）
// 制限: 同一オリジンポリシー
```

---

## パフォーマンス制約

### mousemove イベントの負荷

```javascript
// 問題: mousemove は高頻度で呼び出される
mouseMove(opts) {
  // この処理は毎フレーム実行される可能性がある
  heavyComputation()  // パフォーマンス低下
}

// 解決策: スロットリング
let lastRun = 0
mouseMove(opts) {
  const now = Date.now()
  if (now - lastRun < 16) return  // 60fps 制限
  lastRun = now
  // 処理実行
}
```

### 大量要素の処理

```javascript
// 問題: 数千要素の一括処理
const elements = svgCanvas.getVisibleElements()
elements.forEach(elem => {
  svgCanvas.changeSelectedAttribute('fill', '#ff0000', [elem])  // 遅い
})

// 解決策: バッチ処理
svgCanvas.undoMgr.beginUndoableChange('fill', elements)
elements.forEach(elem => {
  elem.setAttribute('fill', '#ff0000')
})
svgCanvas.undoMgr.finishUndoableChange()
```

### DOM 操作の最適化

```javascript
// 問題: 頻繁な DOM 更新
for (let i = 0; i < 100; i++) {
  parent.appendChild(createNewElement())  // リフロー発生
}

// 解決策: DocumentFragment を使用
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  fragment.appendChild(createNewElement())
}
parent.appendChild(fragment)  // 1回のリフロー
```

---

## ベストプラクティス

### 推奨される実装パターン

```javascript
const name = 'my-extension'

// ロケール読み込みヘルパー
const loadExtensionTranslation = async (svgEditor) => {
  let translationModule
  const lang = svgEditor.configObj.pref('lang')
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name}`)
    translationModule = await import('./locale/en.js')
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}

export default {
  name,
  async init({ svgroot, svgContent, nonce, selectorManager, importLocale }) {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    const { $id, $click } = svgCanvas

    // 翻訳をロード
    await loadExtensionTranslation(svgEditor)

    // 内部状態
    const state = {
      mode: `${name}-mode`,
      active: false,
      data: null
    }

    return {
      name,

      // UI 初期化
      callback() {
        // ボタンを追加
        const template = document.createElement('template')
        template.innerHTML = `
          <se-button id="${name}_tool"
                     title="${name}:buttons.0.title"
                     src="${name}.svg">
          </se-button>
        `
        $id('tools_left').append(template.content.cloneNode(true))

        // イベント登録
        $click($id(`${name}_tool`), () => {
          if (state.active) {
            svgCanvas.setMode('select')
            state.active = false
          } else {
            svgCanvas.setMode(state.mode)
            state.active = true
          }
        })
      },

      // マウスイベント
      mouseDown(opts) {
        if (svgCanvas.getMode() !== state.mode) return undefined

        // 処理開始
        return { started: true }
      },

      mouseMove(opts) {
        if (svgCanvas.getMode() !== state.mode) return undefined
        if (!svgCanvas.getStarted()) return undefined

        // ドラッグ中の処理
      },

      mouseUp(opts) {
        if (svgCanvas.getMode() !== state.mode) return undefined

        // 処理完了
        return { keep: true, started: false }
      },

      // 選択変更
      selectedChanged(opts) {
        // 選択要素に応じた UI 更新
      },

      // ズーム変更
      zoomChanged(zoom) {
        // ズームに応じた表示調整
      },

      // 言語変更
      langReady() {
        // 翻訳適用後の処理
      },

      // 公開 API（他の拡張機能向け）
      getState() {
        return { ...state }
      }
    }
  }
}
```

### チェックリスト

| 項目 | 確認 |
|------|------|
| モード確認 | `svgCanvas.getMode()` で自分のモードか確認しているか |
| 状態確認 | `svgCanvas.getStarted()` で開始状態を確認しているか |
| エラーハンドリング | try-catch で例外を処理しているか |
| ロケール対応 | 翻訳ファイルを用意しているか |
| クリーンアップ | 作成した DOM 要素を適切に削除しているか |
| パフォーマンス | mousemove での重い処理を避けているか |
| セキュリティ | ユーザー入力をサニタイズしているか |

---

## まとめ

### できることの要約

1. カスタム描画ツールの追加
2. UI コンポーネントの追加（限定的な場所）
3. 選択要素の操作
4. レイヤー操作
5. Undo/Redo 対応の操作
6. SVG 要素の作成と変形
7. 国際化対応
8. ファイル操作（ブラウザ API 経由）
9. ズームとパン操作

### できないことの要約

1. コアイベントのキャンセル
2. 拡張機能の実行順序制御
3. プライベート API へのアクセス
4. 内部状態の直接変更
5. 任意の場所への UI 追加
6. 既存イベントハンドラの上書き
7. 他の拡張機能の強制ロード
8. ネイティブファイルシステムへの直接アクセス
9. クロスオリジンリソースの自由な取得
10. SVG DOM の innerHTML 直接操作

### 設計の原則

拡張機能システムは「安全性」と「安定性」を優先して設計されています。制約は意図的なものであり、エディタ全体の信頼性を保つために存在します。
