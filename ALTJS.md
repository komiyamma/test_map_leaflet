# `test_map_leaflet.html` 初学者向け JavaScript 解説

このドキュメントは、`test_map_leaflet.html` と `mapHelpers.js` で使われている JavaScript について、プログラミング初学者が特に理解しにくいであろう箇所を抽出し、その働きや代替案を易しい言葉で解説します。

---

## 1. ファイル構成とそれぞれの役割

この地図表示サンプルは、3つのファイルで構成されています。

*   **`test_map_leaflet.html` (HTML):** ウェブページの骨格を定義します。地図を表示するための `div` タグや、他のファイルを読み込むための `<script>`, `<link>` タグが書かれています。
*   **`mapStyles.css` (CSS):** 見た目を整えるためのファイルです。地図カードのレイアウトやデザインを指定します。
*   **`mapHelpers.js` (JavaScript):** 地図の表示やマーカーの追加といった「動き」を担当する、再利用可能な関数をまとめています。
*   **`test_map_leaflet.html` 内の `<script>` タグ:** そのページ固有の処理を担当します。ここでは、`mapHelpers.js` の関数を呼び出して、実際に2つの地図を初期化する役割を担っています。

HTMLが「体」、CSSが「服」、JavaScriptが「動き」と考えると分かりやすいでしょう。特に JavaScript が2箇所に分かれているのは、**再利用できる部品** (`mapHelpers.js`) と **その場限りの組み立て処理** (HTML内のスクリプト) を分けるという、プログラミングの一般的な考え方に基づいています。

---

## 2. `mapHelpers.js` の解説

このファイルには、地図作成の心臓部となる関数が含まれています。

### 2.1. 非同期処理 `async/await` と `fetch`

`geocode` 関数で使われている `async` や `await` は、時間のかかる処理（ここでは外部サーバーとの通信）をスムーズに扱うためのキーワードです。

```javascript
async function geocode(placeName) {
    // ...
    const response = await fetch(url, ...);
    const data = await response.json();
    // ...
}
```

#### 躓きポイント

*   **`fetch` とは？:** 外部のサーバーと通信するための命令です。例えるなら「レストランで料理を注文する」ようなものです。ここでは Nominatim というAPIサーバーに地名を送り、緯度経度を問い合わせています。
*   **`await` の役割:** `fetch` による通信は、結果が返ってくるまでに時間がかかります。`await` は「料理がテーブルに届くまで待つ」役割をします。これがないと、データが届く前に次の処理に進んでしまい、「まだ来ていない料理を食べようとする」のと同じでエラーになります。
*   **`async` はなぜ必要？:** `await` を使う関数には、必ず先頭に `async` を付けるというルールがあります。「この関数の中では、時間がかかる処理を待ちますよ」という合図だと考えてください。

#### 代替案：昔ながらの `.then()` を使った書き方

`async/await` が登場する前は、`.then()` というメソッドで非同期処理を書いていました。「もし通信が成功し**たら、その次に**この処理をしてね」というように、処理を繋げていくイメージです。

```javascript
function geocode(placeName) {
    // ...
    fetch(url, ...)
        .then(response => response.json()) // 注文が届いたら、食べられる形にする
        .then(data => { // 食べられる形になったら、中身を確認する
            // ...
        })
        .catch(error => { // もし注文自体が失敗したら...
            console.error("通信エラー:", error);
        });
}
```
`async/await` は、この `.then()` の連鎖を、まるで同期処理（上から順に実行される処理）のようにスッキリ書けるようにした現代的な書き方です。

### 2.2. 関数の中に関数（入れ子関数 / クロージャ）

`createMap` 関数の内側で `addPlace` という別の関数が定義されています。

```javascript
function createMap(containerId, startPoint, placeName) {
    const map = L.map(...);
    const bounds = [];
    // ...

    async function addPlace() {
        bounds.push(startPoint.center); // 外側の変数 `bounds` を使っている
        const latLng = await geocode(placeName);
        if (latLng) {
            L.marker(latLng).addTo(map); // 外側の変数 `map` を使っている
        }
        // ...
    }

    addPlace();
    return map;
}
```
#### 躓きポイント

*   **なぜ内側で定義するのか？:** `addPlace` 関数は、その外側にある `createMap` 関数の変数 (`map` や `bounds` など) を直接利用しています。これは、親子関係にある関数が、親の持つ道具（変数）を自由に使えるようなイメージです。もし `addPlace` を外に出すと、これらの変数をわざわざ引数として渡す必要が出てきます。
*   **スコープ（変数が使える範囲）:** `createMap` の中で定義された変数は、その中でしか原則使えません。内側の `addPlace` は特別にそれらを使えますが、外側の世界からは使えません。変数が有効な範囲を限定することで、コードの安全性を高めています。この仕組みは **クロージャ** と呼ばれ、JavaScriptの重要な概念の一つです。

#### 代替案：関数を外に出し、引数でデータを渡す

もし入れ子構造が分かりにくいなら、関数を外に出して、必要な情報をすべて引数として渡す形に書き換えることもできます。

```javascript
async function addPlaceToMap(map, startPoint, placeName, bounds) {
    // ... 引数で渡された map や bounds を使う
}

function createMap(containerId, startPoint, placeName) {
    const map = L.map(...);
    const bounds = [];
    // ...
    // 外に出した関数を呼び出し、必要な変数をすべて渡す
    addPlaceToMap(map, startPoint, placeName, bounds);
    return map;
}
```
この方法だと各関数が独立して分かりやすくなりますが、渡す引数が増える傾向があります。

---

## 3. `test_map_leaflet.html` 内のスクリプト解説

このHTMLファイルに直接書かれたスクリプトは、ページが読み込まれたときに `mapHelpers.js` の関数を呼び出し、地図をセットアップする役割を担います。

### 3.1. HTML要素の操作（DOM操作）

`setCardHeader` 関数は、JavaScriptでHTMLの一部を書き換える「DOM操作」の例です。
このサンプルでは、ヘッダー要素にあらかじめ `map1-header` のような `id` を付けておき、それを直接JavaScriptから操作する、堅実で分かりやすい方法を採用しています。

**HTML側:**
```html
<div id="map1-header" class="card-header"></div>
<div id="map1" class="map"></div>
```

**JavaScript側:**
```javascript
function setCardHeader(headerId, titleText) {
    const headerEl = document.getElementById(headerId);

    // ヘッダー要素が取得できない場合は静かに中断
    if (!headerEl) return;

    // 空文字を入れて "undefined" や "null" などが出ないようにする
    headerEl.textContent = titleText || '';
}

// 呼び出し
setCardHeader("map1-header", "フィリピン");
```

#### ポイント

*   **`document.getElementById(headerId)`:** `document` はHTML文書全体を指すオブジェクトです。`getElementById` は、その中から指定された `id` を持つHTML要素を探し出し、JavaScriptで操作できるようにします。`id` はページ内でユニーク（一意）であるため、最も確実な要素の特定方法です。
*   **`!headerEl` でのチェック:** `getElementById` は、もし指定された `id` が見つからなかった場合に `null` を返します。`if (!headerEl) return;` の一行は、「もし `headerEl` が `null` なら、何もせずに関数を終了する」という意味の安全装置です。これにより、意図しないエラーでプログラム全体が止まるのを防ぎます。
*   **`.textContent` への代入:** これが実際にHTML要素のテキストを書き換えている部分です。`titleText || ''` は、もし `titleText` が `undefined` や `null` であってもエラーにならず、代わりに空文字が設定されるようにするための、ちょっとしたテクニックです。


### 3.2. ページの読み込みを待つ `DOMContentLoaded`

```javascript
window.addEventListener("DOMContentLoaded", () => {
    // この中のコードは、HTMLの読み込みが終わってから実行される
    const startPoint = { ... };
    setCardMap("map1", "フィリピン", startPoint, "フィリピン");
    setCardMap("map2", "大坂", startPoint, "大坂");
});
```
`document.getElementById` などでHTML要素を操作するには、その要素がブラウザに読み込まれている必要があります。もしこのスクリプトがHTMLの上の方（`<head>`内など）に書かれていると、まだHTML要素が作られていないのに操作しようとしてエラーになってしまいます。

`DOMContentLoaded` イベントは、「HTMLの構造がすべて準備できましたよ」という合図です。この中で処理を行うことで、確実にHTML要素を操作できるようになります。
