# SVG-Edit カスタマイズ作業記録

## 概要

SVG-Editエディタに対して以下のカスタマイズを実施した。

1. **キャンバスサイズの拡大**: デフォルトのドキュメントサイズを640x480から1920x1440に変更
2. **スクロール領域の調整**: `canvas_expansion`を3から1に変更し、編集可能領域とスクロール可能領域を一致させた
3. **初期7角形の描画**: エディタ起動時および新規ドキュメント作成時に7角形（ヘプタゴン）を自動描画

---

## 変更ファイル一覧

### 1. `/packages/svgcanvas/svgcanvas.js`

**変更内容**: デフォルトのドキュメントサイズを変更

```javascript
// 変更前 (163-168行目)
this.curConfig = {
  show_outside_canvas: true,
  selectNew: true,
  dimensions: [640, 480]  // ← 変更前
}

// 変更後
this.curConfig = {
  show_outside_canvas: true,
  selectNew: true,
  dimensions: [1920, 1440]  // ← 変更後
}
```

**注意**: このファイルを変更した後は、svgcanvasパッケージのリビルドが必要：
```bash
npm run build --workspace=@svgedit/svgcanvas
```

---

### 2. `/src/editor/ConfigObj.js`

**変更内容**: エディタのデフォルト設定を変更

```javascript
// canvas_expansion (118行目付近)
canvas_expansion: 1,  // 変更前: 3

// dimensions (146行目付近)
dimensions: [1920, 1440],  // 変更前: [640, 480]
```

**設定の説明**:
- `canvas_expansion`: キャンバス外のスクロール可能領域の倍率。1にすると編集領域=スクロール領域
- `dimensions`: 新規ドキュメントのデフォルトサイズ [幅, 高さ]

---

### 3. `/src/editor/Editor.js`

**変更内容**: 7角形描画メソッドの追加と`afterClear`イベントでの呼び出し

```javascript
// afterClearメソッド (798-801行目)
afterClear (win) {
  this.svgCanvas.runExtensions('afterClear')
  this.drawInitialHeptagon()  // ← 追加
}

// 新規追加メソッド (803-830行目)
drawInitialHeptagon () {
  const cx = 320 // center x
  const cy = 240 // center y
  const r = 100 // radius
  const sides = 7
  const points = []
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i / sides) - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x},${y}`)
  }

  const layer = this.svgCanvas.getCurrentDrawing().getCurrentLayer()
  if (layer) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttribute('points', points.join(' '))
    polygon.setAttribute('fill', '#ffcccc')
    polygon.setAttribute('stroke', '#000000')
    polygon.setAttribute('stroke-width', '2')
    polygon.setAttribute('id', this.svgCanvas.getNextId())
    layer.appendChild(polygon)
  }
}
```

---

### 4. `/src/editor/EditorStartup.js`

**変更内容**: 初回起動時に7角形を描画

```javascript
// 649-652行目
// Draw initial heptagon (7-sided polygon)
this.ready(() => {
  this.drawInitialHeptagon()
})
```

---

## アーキテクチャ概要

### パッケージ構成

```
svgedit/
├── packages/
│   └── svgcanvas/          # SVGキャンバスライブラリ (npmパッケージ)
│       ├── core/           # コア機能
│       │   ├── clear.js    # キャンバスクリア処理
│       │   ├── selected-elem.js  # 選択要素・キャンバス更新
│       │   └── ...
│       ├── svgcanvas.js    # メインクラス
│       └── dist/           # ビルド出力 (実際に使用される)
│
└── src/
    └── editor/             # エディタUI
        ├── Editor.js       # メインエディタクラス
        ├── EditorStartup.js # 起動処理
        ├── ConfigObj.js    # 設定管理
        └── extensions/     # 拡張機能
            └── ext-opensave/  # ファイル操作拡張
```

### 重要な処理フロー

#### 1. ドキュメントサイズの決定フロー

```
ConfigObj.js (defaultConfig.dimensions)
    ↓
EditorStartup.js (new SvgCanvas(container, this.configObj.curConfig))
    ↓
svgcanvas.js (this.curConfig = mergeDeep(defaults, config))
    ↓
clear.js (clearSvgContentElementInit - 実際にSVG要素に適用)
```

#### 2. 新規ドキュメント作成フロー

```
ユーザー: ファイル → 新規
    ↓
ext-opensave.js (clickClear)
    ↓
svgCanvas.clear()
    ↓
svgcanvas.js clear() → this.call('afterClear')
    ↓
Editor.js afterClear() → drawInitialHeptagon()
```

#### 3. キャンバス更新フロー

```
updateCanvas(w, h) in selected-elem.js
    ↓
svgRoot (外枠SVG) のサイズ設定
    ↓
svgContent (内部SVG) の位置・サイズ・viewBox設定
    ↓
canvasBackground の更新
```

---

## 既知の問題と注意点

### 1. localStorageのキャッシュ

ブラウザのlocalStorageに以前のSVGデータが保存されている場合、新しいデフォルトサイズが適用されない。

**解決方法**: ブラウザコンソールで実行
```javascript
localStorage.clear()
```

### 2. svgcanvasパッケージのリビルド

`packages/svgcanvas/`内のファイルを変更した場合、distファイルのリビルドが必要。

```bash
npm run build --workspace=@svgedit/svgcanvas
```

エディタ側（`src/editor/`）のファイルは即座に反映される（開発サーバー使用時）。

### 3. フィードバックループの危険性

`selected-elem.js`の`updateCanvas`関数を変更する際は注意が必要。`getResolution()`が`svgContent`の幅を読み取るため、不適切な変更はサイズが無限に拡大するフィードバックループを引き起こす可能性がある。

---

## 開発サーバーの起動

```bash
npm run start
```

URL: http://localhost:8000/src/editor/index.html

---

## 今後の拡張案

1. **7角形のパラメータ化**: 中心座標、半径、辺数を設定可能に
2. **初期図形の選択**: 設定から初期描画する図形を選択可能に
3. **ドキュメントサイズのUI**: 新規作成時にサイズを選択できるダイアログ

---

## 参考: 主要クラスとメソッド

| クラス/ファイル | 主要メソッド | 説明 |
|----------------|-------------|------|
| SvgCanvas | clear() | キャンバスをクリアして新規ドキュメント作成 |
| SvgCanvas | getCurConfig() | 現在の設定を取得 |
| SvgCanvas | setResolution(w, h) | ドキュメントサイズを設定 |
| SvgCanvas | getCurrentDrawing() | 現在のDrawingオブジェクトを取得 |
| Editor | afterClear() | クリア後に呼ばれるイベントハンドラ |
| Editor | drawInitialHeptagon() | 7角形を描画 |
| ConfigObj | curConfig | 現在の設定オブジェクト |

---


### 5. `/src/editor/Editor.js` (2026-01-25 追記)

**変更内容**: 初期描画される7角形を`<polygon>`要素から`<path>`要素に変更

```javascript
// drawInitialHeptagonメソッド
// 変更後
drawInitialHeptagon () {
  // ...
  let pathData = ''
  for (let i = 0; i < sides; i++) {
    // ...
    if (i === 0) {
      pathData += \`M ${x} ${y} \`
    } else {
      pathData += \`L ${x} ${y} \`
    }
  }
  pathData += 'Z'
  
  // ...
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathData)
  // ...
}
```

*最終更新: 2026-01-25*
