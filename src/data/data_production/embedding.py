import os
import pandas as pd
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
apiKey = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=apiKey)

# 元のJSONファイル（ノードとリンクの情報が含まれている）
with open('1.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# "categories" と "links" をそれぞれ取得
categories = data.get("categories", {})
links = data.get("links", [])

# カテゴリごとにノード情報を作成（各ノードに "text" と "category" を持たせる）
data_list = []
for category, texts in categories.items():
    for text in texts:
        data_list.append({"text": text, "category": category})

df = pd.DataFrame(data_list)

def get_embedding(text, model="text-embedding-3-small"):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

# 各ノードのembeddingを計算
df['embedding'] = df['text'].apply(get_embedding)

# ノード情報（embedding付き）をリスト化
nodes = df.to_dict(orient='records')

# 最終出力：ノード情報とリンク情報の両方を含む
final_data = {
    "nodes": nodes,
    "links": links
}

with open('2.json', 'w', encoding='utf-8') as file:
    json.dump(final_data, file, ensure_ascii=False, indent=2)

print("✅ embedding とリンク情報を含む JSON '2.json' を保存しました。")

