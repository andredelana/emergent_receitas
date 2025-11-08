import requests
import sys
import json

class TudoGostosoTester:
    def __init__(self, base_url="https://image-free-recipes.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def test_dev_login(self):
        """Test dev login with dev/55555"""
        print(f"\n🔍 Testing Dev Login...")
        self.tests_run += 1
        
        try:
            url = f"{self.api_url}/auth/login"
            headers = {'Content-Type': 'application/json'}
            data = {"username": "dev", "password": "55555"}
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if 'token' in result:
                    self.token = result['token']
                    self.tests_passed += 1
                    print(f"✅ Passed - Login successful")
                    print(f"   User: {result.get('name', 'Unknown')}")
                    print(f"   Token obtained: {self.token[:20]}...")
                    return True
                else:
                    print(f"❌ Failed - No token in response")
                    return False
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_search_web_recipes(self):
        """Test searching recipes on TudoGostoso web"""
        search_data = {
            "query": "arroz a grega"
        }
        
        print(f"\n🔍 Testing Web Recipe Search...")
        self.tests_run += 1
        
        try:
            url = f"{self.api_url}/recipes/search-web"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            
            response = requests.post(url, json=search_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if recipes key exists
                if 'recipes' not in data:
                    print(f"❌ Failed - No 'recipes' key in response")
                    print(f"   Response: {data}")
                    return False
                
                recipes = data['recipes']
                
                # Check if we got results (up to 5)
                if not isinstance(recipes, list):
                    print(f"❌ Failed - 'recipes' is not a list")
                    return False
                
                if len(recipes) == 0:
                    print(f"❌ Failed - No recipes found for query 'arroz a grega'")
                    return False
                
                if len(recipes) > 5:
                    print(f"❌ Failed - Too many recipes returned: {len(recipes)} (max 5)")
                    return False
                
                # Check recipe structure
                for i, recipe in enumerate(recipes):
                    if not isinstance(recipe, dict):
                        print(f"❌ Failed - Recipe {i} is not a dict")
                        return False
                    
                    required_fields = ['name', 'url', 'image_url']
                    for field in required_fields:
                        if field not in recipe:
                            print(f"❌ Failed - Recipe {i} missing field: {field}")
                            return False
                    
                    # Check if URL is from TudoGostoso
                    if 'tudogostoso.com.br' not in recipe['url']:
                        print(f"❌ Failed - Recipe {i} URL not from TudoGostoso: {recipe['url']}")
                        return False
                
                self.tests_passed += 1
                print(f"✅ Passed - Found {len(recipes)} recipes from TudoGostoso")
                for i, recipe in enumerate(recipes):
                    print(f"   Recipe {i+1}: {recipe['name']}")
                    print(f"   URL: {recipe['url']}")
                    if recipe['image_url']:
                        print(f"   Image: {recipe['image_url'][:50]}...")
                
                return True
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_import_from_tudogostoso(self):
        """Test importing a complete recipe from TudoGostoso"""
        # Use a known TudoGostoso URL for testing
        import_data = {
            "url": "https://www.tudogostoso.com.br/receita/28-arroz-a-grega.html"
        }
        
        print(f"\n🔍 Testing TudoGostoso Recipe Import...")
        self.tests_run += 1
        
        try:
            url = f"{self.api_url}/recipes/import-from-tudogostoso"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            
            response = requests.post(url, json=import_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['name', 'portions', 'ingredients', 'notes', 'link']
                for field in required_fields:
                    if field not in data:
                        print(f"❌ Failed - Missing field: {field}")
                        print(f"   Response: {data}")
                        return False
                
                # Check ingredients structure
                ingredients = data['ingredients']
                if not isinstance(ingredients, list):
                    print(f"❌ Failed - 'ingredients' is not a list")
                    return False
                
                if len(ingredients) == 0:
                    print(f"❌ Failed - No ingredients found")
                    return False
                
                # Check ingredient structure
                for i, ing in enumerate(ingredients):
                    if not isinstance(ing, dict):
                        print(f"❌ Failed - Ingredient {i} is not a dict")
                        return False
                    
                    required_ing_fields = ['name', 'quantity', 'unit', 'mandatory']
                    for field in required_ing_fields:
                        if field not in ing:
                            print(f"❌ Failed - Ingredient {i} missing field: {field}")
                            return False
                    
                    # Check data types
                    if not isinstance(ing['name'], str) or not ing['name'].strip():
                        print(f"❌ Failed - Ingredient {i} name is not a valid string")
                        return False
                    
                    if not isinstance(ing['quantity'], (int, float)) or ing['quantity'] <= 0:
                        print(f"❌ Failed - Ingredient {i} quantity is not a valid number: {ing['quantity']}")
                        return False
                    
                    if not isinstance(ing['unit'], str) or not ing['unit'].strip():
                        print(f"❌ Failed - Ingredient {i} unit is not a valid string")
                        return False
                    
                    if not isinstance(ing['mandatory'], bool):
                        print(f"❌ Failed - Ingredient {i} mandatory is not a boolean")
                        return False
                
                # Check portions is a number
                if not isinstance(data['portions'], int) or data['portions'] <= 0:
                    print(f"❌ Failed - Portions is not a valid integer: {data['portions']}")
                    return False
                
                # Check link matches the input URL
                if data['link'] != import_data['url']:
                    print(f"❌ Failed - Link doesn't match input URL")
                    print(f"   Expected: {import_data['url']}")
                    print(f"   Got: {data['link']}")
                    return False
                
                self.tests_passed += 1
                print(f"✅ Passed - Recipe imported successfully")
                print(f"   Name: {data['name']}")
                print(f"   Portions: {data['portions']}")
                print(f"   Ingredients: {len(ingredients)}")
                print(f"   Notes length: {len(data.get('notes', ''))}")
                
                # Show first few ingredients
                for i, ing in enumerate(ingredients[:3]):
                    print(f"   Ingredient {i+1}: {ing['quantity']} {ing['unit']} {ing['name']} (mandatory: {ing['mandatory']})")
                
                return True
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

def main():
    print("🧪 Testing TudoGostoso Web Scraping Endpoints")
    print("=" * 50)
    
    tester = TudoGostosoTester()
    
    # Login first
    if not tester.test_dev_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test TudoGostoso endpoints
    tester.test_search_web_recipes()
    tester.test_import_from_tudogostoso()
    
    # Print results
    print(f"\n📊 FINAL RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())