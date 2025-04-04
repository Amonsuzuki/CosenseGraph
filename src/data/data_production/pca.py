import json
import numpy as np
from sklearn.decomposition import PCA

# JSONファイルからデータを読み込む（"nodes" と "links" が含まれている前提）
with open('2.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

nodes = data.get("nodes", [])
links = data.get("links", [])

# ノードの embedding 情報を抽出
embeddings = np.array([node['embedding'] for node in nodes])

# PCAを使って embedding の次元を3に削減
pca = PCA(n_components=3)
reduced_embeddings = pca.fit_transform(embeddings)

# embedding 情報を除外した新しいノードリストを作成
new_nodes = []
for i, node in enumerate(nodes):
    new_node = {
        "text": node.get("text"),
        "category": node.get("category"),
        "x": reduced_embeddings[i, 0],
        "y": reduced_embeddings[i, 1],
        "z": reduced_embeddings[i, 2],
    }
    new_nodes.append(new_node)

# ノードとリンクの両方を含む最終データ
final_data = {
    "nodes": new_nodes,
    "links": links
}

# 新しい JSON ファイルに保存
with open('3.json', 'w', encoding='utf-8') as output_file:
    json.dump(final_data, output_file, ensure_ascii=False, indent=2)

print("Reduced data saved to '3.json'")

