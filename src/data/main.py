import requests
import time
import os
from dotenv import load_dotenv
from pathlib import Path
from openai import OpenAI
import numpy as np
from sklearn.preprocessing import normalize
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from collections import defaultdict
import random
import json

OUTPUT_FILE = "data.json"

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_project_info(project):
	base_url = f"https://scrapbox.io/api/pages/{project}"
	skip = 0
	limit = 100
	titles = []
	links = []

	while True:
		url = f"{base_url}?skip={skip}&limit={limit}"
		response = requests.get(url)
		response.raise_for_status()
		data = response.json()
		pages = data.get("pages", [])

		if not pages:
			break

		titles.extend([page["title"] for page in pages])

		for page in pages:
			source = page["title"]
			page_url = f"{base_url}/{source}"
			resp_page = requests.get(page_url)
			page_data = resp_page.json()
			if "links" in page_data:
				for target in page_data["links"]:
					links.append({
						"source": source,
						"target": target
					})
			time.sleep(0.1)

		if len(pages) < limit:
			break
		skip += limit

	return titles, links

def get_embeddings(texts):
	embeddings = []
	for text in texts:
		response = client.embeddings.create(input=[text], model="text-embedding-3-small")
		embedding = response.data[0].embedding
		embeddings.append(embedding)
	return np.array(embeddings)

def get_category_name(titles_in_cluster):
	prompt = (
		"The following titles are grouped by semantic similarity:\n\n"
		+ "\n".join(f"- {title}" for title in titles_in_cluster)
		+ "\n\nRespond with ONLY a short and meaningful category name (no explanation, no punctuation)."
	)
	print(f"prompt: {prompt}")
	response = client.chat.completions.create(
		model="gpt-4o",
		messages=[
			{"role": "system", "content": "You are a helpful assistant that summarizes groups of text titles."},
			{"role": "user", "content": prompt}
		]
	)
	return response.choices[0].message.content.strip()

def create_nodes(title_category_embedding_list):
	embeddings = np.array([item["embedding"] for item in title_category_embedding_list])
	pca = PCA(n_components=3)
	reduced_embeddings = pca.fit_transform(embeddings)

	nodes = []
	for i, node in enumerate(title_category_embedding_list):
		new_node = {
			"text": node["title"],
			"category": node["category"],
			"x": reduced_embeddings[i, 0],
			"y": reduced_embeddings[i, 1],
			"z": reduced_embeddings[i, 2],
		}
		nodes.append(new_node)
	return nodes

if __name__ == "__main__":
	#Load from .env
	project = "mitou-meikan"

	#Import Page information
	titles, links = get_project_info(project)

	#Get embedding data
	embeddings = get_embeddings(titles)
	embeddings_normalized = normalize(embeddings)

	#Categorize
	n_clusters = 10
	if len(titles) < n_clusters:
		n_clusters = len(titles)
	kmeans = KMeans(n_clusters=n_clusters, init='k-means++', random_state=42)
	labels = kmeans.fit_predict(embeddings_normalized)

	#Sort titles by labels
	clustered_titles = defaultdict(list)
	for title, label in zip(titles, labels):
		clustered_titles[label].append(title)

	#Get category name
	label_to_category = {}
	for cluster_id, titles_in_cluster in clustered_titles.items():
		category_name = get_category_name(random.sample(titles_in_cluster, min(len(titles_in_cluster), 30)))
		label_to_category[cluster_id] = category_name

	#Combine titles, embeddings, and categories
	title_category_embedding_list = []
	for title, label, embedding in zip(titles, labels, embeddings):
		title_category_embedding_list.append({
			"title": title,
			"category": label_to_category[label],
			"embedding": embedding
		})

	#Reduce dimension of embeddings
	nodes = create_nodes(title_category_embedding_list)

	final_data = {
		"nodes": nodes,
		"links": links
	}

	with open(f"{OUTPUT_FILE}", "w", encoding="utf-8") as f:
		json.dump(final_data, f, ensure_ascii=False, indent=2)

	print(f"All data preserved into {OUTPUT_FILE}.")
