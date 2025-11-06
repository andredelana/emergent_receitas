#!/usr/bin/env python3
"""
Focused test for automatic image generation functionality
Based on the specific review request requirements
"""

import requests
import json
import sys

def test_image_generation_flow():
    """Test the complete image generation flow as specified in review request"""
    
    base_url = "https://menusabor.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🧪 FOCUSED IMAGE GENERATION TEST")
    print("=" * 50)
    
    # Step 1: Login with dev credentials
    print("\n1️⃣ Testing Login...")
    login_response = requests.post(
        f"{api_url}/auth/login",
        json={"email": "dev", "password": "55555"},
        headers={'Content-Type': 'application/json'}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()['token']
    print(f"✅ Login successful - Token obtained")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    # Step 2: Create recipe WITHOUT image (exact data from review request)
    print("\n2️⃣ Testing Recipe Creation WITHOUT Image...")
    recipe_data = {
        "name": "Teste de Geração de Imagem",
        "portions": 4,
        "link": "",
        "notes": "Receita de teste para validar geração automática de imagem",
        "ingredients": [
            {
                "name": "frango",
                "quantity": 500,
                "unit": "g",
                "mandatory": True
            },
            {
                "name": "batata",
                "quantity": 3,
                "unit": "unidades",
                "mandatory": True
            }
        ]
    }
    
    create_response = requests.post(
        f"{api_url}/recipes",
        json=recipe_data,
        headers=headers,
        timeout=60  # Allow time for image generation
    )
    
    if create_response.status_code != 200:
        print(f"❌ Recipe creation failed: {create_response.status_code}")
        try:
            print(f"   Error: {create_response.json()}")
        except:
            print(f"   Response: {create_response.text}")
        return False
    
    recipe = create_response.json()
    recipe_id = recipe['id']
    print(f"✅ Recipe created successfully - ID: {recipe_id}")
    
    # Step 3: Verify image was generated
    print("\n3️⃣ Verifying Auto-Generated Image...")
    
    imagem_url = recipe.get('imagem_url', '')
    
    # Check 1: Image URL exists
    if not imagem_url:
        print(f"❌ FAILED - No imagem_url field in response")
        return False
    
    print(f"✅ Image URL field exists")
    
    # Check 2: Image starts with correct base64 prefix
    if not imagem_url.startswith("data:image/png;base64,"):
        print(f"❌ FAILED - Image URL doesn't start with 'data:image/png;base64,'")
        print(f"   Got: {imagem_url[:50]}...")
        return False
    
    print(f"✅ Image URL has correct base64 format")
    
    # Check 3: Base64 data is substantial (real image)
    base64_part = imagem_url.replace("data:image/png;base64,", "")
    if len(base64_part) < 1000:  # Should be much longer for a real image
        print(f"❌ FAILED - Base64 data too short: {len(base64_part)} chars")
        return False
    
    print(f"✅ Base64 data is substantial: {len(base64_part)} chars")
    
    # Step 4: Test update of recipe without image
    print("\n4️⃣ Testing Recipe Update (should generate image if missing)...")
    
    # Create another recipe without image for update test
    recipe_data_2 = {
        "name": "Receita Para Update Test",
        "portions": 2,
        "link": "",
        "notes": "Receita para testar update sem imagem",
        "ingredients": [
            {
                "name": "arroz",
                "quantity": 200,
                "unit": "g",
                "mandatory": True
            }
        ],
        "imagem_url": ""  # Explicitly no image
    }
    
    create_response_2 = requests.post(
        f"{api_url}/recipes",
        json=recipe_data_2,
        headers=headers,
        timeout=60
    )
    
    if create_response_2.status_code != 200:
        print(f"❌ Second recipe creation failed: {create_response_2.status_code}")
        return False
    
    recipe_2 = create_response_2.json()
    recipe_id_2 = recipe_2['id']
    
    # Remove image if it was auto-generated
    if recipe_2.get('imagem_url'):
        remove_image_response = requests.put(
            f"{api_url}/recipes/{recipe_id_2}",
            json={"imagem_url": ""},
            headers=headers
        )
    
    # Now update with new notes (should trigger image generation)
    update_response = requests.put(
        f"{api_url}/recipes/{recipe_id_2}",
        json={"notes": "Nota atualizada"},
        headers=headers,
        timeout=60
    )
    
    if update_response.status_code != 200:
        print(f"❌ Recipe update failed: {update_response.status_code}")
        return False
    
    updated_recipe = update_response.json()
    updated_imagem_url = updated_recipe.get('imagem_url', '')
    
    if not updated_imagem_url or not updated_imagem_url.startswith("data:image/png;base64,"):
        print(f"❌ FAILED - Update didn't generate image properly")
        print(f"   Image URL: {updated_imagem_url[:50] if updated_imagem_url else 'None'}...")
        return False
    
    print(f"✅ Recipe update generated image successfully")
    
    # Cleanup
    print("\n5️⃣ Cleaning up test recipes...")
    requests.delete(f"{api_url}/recipes/{recipe_id}", headers=headers)
    requests.delete(f"{api_url}/recipes/{recipe_id_2}", headers=headers)
    print(f"✅ Test recipes cleaned up")
    
    print(f"\n🎉 ALL IMAGE GENERATION TESTS PASSED!")
    print(f"✅ Recipes created without image automatically receive AI-generated images")
    print(f"✅ Images are in correct base64 format: data:image/png;base64,...")
    print(f"✅ Recipe updates without images trigger automatic image generation")
    print(f"✅ No errors in the image generation process")
    
    return True

if __name__ == "__main__":
    success = test_image_generation_flow()
    sys.exit(0 if success else 1)