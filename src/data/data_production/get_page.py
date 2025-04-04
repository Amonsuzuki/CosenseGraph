import requests
import json
import time

# Scrapbox プロジェクト名（適宜変更してください）
project_name = "hankyusyoki"
base_url = f"https://scrapbox.io/api/pages/{project_name}"

# 取得したいラベル（カテゴリ）と、ラベルにマッチしなかった場合は "その他"
labels = ["実", "A", "B", "デ", "回", "磁", "英", "核", "序"]
categories = {label: [] for label in labels}
categories["その他"] = []

# APIから全ページ取得（概要情報）
response = requests.get(base_url)
data = response.json()

# ページ（ノード）を分類しながら、全タイトルの集合を作成
nodes_set = set()
for page in data.get("pages", []):
    title = page["title"]
    matched = False
    for label in labels:
        if label in title:
            categories[label].append(title)
            matched = True
    if not matched:
        categories["その他"].append(title)
    nodes_set.add(title)

# 各ページのリンク（エッジ）情報を抽出するため、各ページの詳細情報を取得
edges = []
for page in data.get("pages", []):
    source = page["title"]
    # 個々のページの詳細情報エンドポイント
    page_url = f"{base_url}/{source}"
    resp_page = requests.get(page_url)
    page_data = resp_page.json()
    if "links" in page_data:
        for target in page_data["links"]:
            # ターゲットが実際に存在するページである場合のみエッジとして追加
            if target in nodes_set:
                edges.append({
                    "source": source,
                    "target": target
                })
    # 連続リクエストでのレート制限対策として少し待機
    time.sleep(0.1)

# 最終的なグラフ構造をJSON形式で作成
graph_data = {
    "categories": categories,
    "links": edges
}

# JSONファイルとして保存
with open("1.json", "w", encoding="utf-8") as f:
    json.dump(graph_data, f, ensure_ascii=False, indent=2)

print("✅ エッジ情報を含むJSONファイル '1.json' を保存しました。")

