#!/usr/bin/env python3
import requests
import json

# Test de l'endpoint technical-interview
url = "http://localhost:8000/api/interviews/applications/4/technical-interview/"

print("🔍 Test de l'endpoint technical-interview")
print("=" * 50)

# Test OPTIONS pour vérifier que l'endpoint existe
try:
    response = requests.options(url)
    print(f"OPTIONS {url}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Endpoint accessible!")
        print(f"Allowed methods: {response.headers.get('Allow', 'N/A')}")
    else:
        print("❌ Endpoint non accessible")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Erreur de connexion: {e}")

print("\n" + "=" * 50)

# Test POST sans authentification (devrait retourner 401)
try:
    post_data = {
        "date": "2025-09-24",
        "time": "10:00", 
        "location": "Test location",
        "candidate_email": "test@example.com"
    }
    
    response = requests.post(url, json=post_data)
    print(f"POST {url}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 401:
        print("✅ Authentification requise (normal)")
    elif response.status_code == 404:
        print("❌ Endpoint non trouvé")
    else:
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Erreur POST: {e}")

print("\n" + "=" * 50)

# Test des URLs disponibles
try:
    api_response = requests.get("http://localhost:8000/api/interviews/")
    print(f"📋 API Root Status: {api_response.status_code}")
    
    # Test de l'endpoint applications
    apps_response = requests.get("http://localhost:8000/api/interviews/applications/")
    print(f"📋 Applications endpoint: {apps_response.status_code}")
    
    # Lister les URLs du router
    if api_response.status_code == 200:
        print("📋 URLs disponibles:")
        data = api_response.json()
        for key, value in data.items():
            print(f"  - {key}: {value}")
    
except Exception as e:
    print(f"❌ Erreur API: {e}")
