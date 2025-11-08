import requests
import json

# Test with different query
base_url = "https://image-free-recipes.preview.emergentagent.com"
api_url = f"{base_url}/api"

# Login first
login_response = requests.post(f"{api_url}/auth/login", json={"username": "dev", "password": "55555"})
token = login_response.json()['token']

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}

# Test search with different query
search_response = requests.post(f"{api_url}/recipes/search-web", json={"query": "bolo de chocolate"}, headers=headers)
print("Search Response:")
print(json.dumps(search_response.json(), indent=2, ensure_ascii=False))

# Test import with different URL
import_response = requests.post(f"{api_url}/recipes/import-from-tudogostoso", json={"url": "https://www.tudogostoso.com.br/receita/123-bolo-de-chocolate.html"}, headers=headers)
print("\nImport Response:")
print(json.dumps(import_response.json(), indent=2, ensure_ascii=False))