/*
 * Leaflet で複数ページから共有したい地図関連ユーティリティ。
 * グローバルに Leaflet (L) が読み込まれている前提で記述している。
 */

// 簡易ジオコーディング関数（ヒットしなければ null を返す）
async function geocode(placeName) {
    if (!placeName) return null;
    // 引数は外部から渡され、null なら即座に終了するようにする

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`;
    // encodeURIComponent でマルチバイト文字をエンコードしておく
    const response = await fetch(url, { headers: { "Accept-Language": "ja" } });
    // Accept-Language を指定して日本語を優先（実運用では User-Agent も付けると良い）
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const location = data[0];
    // Nominatim が返す lat / lon は文字列なので数値化して返す
    return [parseFloat(location.lat), parseFloat(location.lon)];
    // Leaflet で使えるように [lat, lon] の順にしておく
}

// Leaflet マップ生成とジオコーディング済みマーカーの追加を一括で行う
function createMap(containerId, startPoint, placeName) {
    // カード内で Leaflet マップを生成し既定の表示位置を設定
    const map = L.map(containerId, { attributionControl: false }).setView(startPoint.center, startPoint.zoom);
    // attribution はカードのフッターにまとめるので非表示
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    // OSM の汎用タイル。URL を変えれば別プロバイダーに差し替え可能

    const bounds = [];
    // 表示範囲を fitBounds で調整するための配列

    async function addPlace() {
        // 内側で非同期ジオコーディングを行うため関数化
        bounds.push(startPoint.center);
        // 中心点は必ず含めておく

        if (placeName) {
            // 地名が指定されている場合のみジオコーディング
            const latLng = await geocode(placeName); // [緯度, 経度]
            // await を使って結果が返ってからマップを更新
            if (latLng) {
                bounds.push(latLng);
                // bounds に地点を追加して全体を表示できるようにする
                const marker = L.marker(latLng).addTo(map);
                // 得られた地点にマーカーを追加
                marker.bindPopup(`<strong>${placeName}</strong>`);
                // ポップアップに地名を表示するだけのシンプルな例
            }
        }

        if (bounds.length > 1) {
            // 中心と目的地の 2 か所以上ある場合は全体が収まるように調整
            map.fitBounds(bounds, { padding: [50, 50] });
            // 適度な余白を設けてマーカーが端に寄らないようにする
        } else {
            map.setView(startPoint.center, startPoint.zoom);
            // 目的地が無ければ初期値のまま固定
        }
    }

    addPlace();
    // 非同期処理をトリガー。エラー制御は必要に応じて追加
    return map;
}
