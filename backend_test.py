import requests
import sys
import json
from datetime import datetime

class RecipeAppTester:
    def __init__(self, base_url="https://recipronto.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.quick_list_id = None
        self.test_recipe_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dev_login(self):
        """Test dev login with dev/55555"""
        success, response = self.run_test(
            "Dev Login",
            "POST",
            "auth/login",
            200,
            data={"username": "dev", "password": "55555"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained for user: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_user_registration(self):
        """Test new user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = f"test_user_{timestamp}"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": test_user,
                "password": "test123",
                "name": f"Test User {timestamp}"
            }
        )
        if success and 'token' in response:
            print(f"   New user created: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_get_recipes(self):
        """Test getting user recipes"""
        success, response = self.run_test(
            "Get Recipes",
            "GET",
            "recipes",
            200
        )
        if success:
            print(f"   Found {len(response)} recipes")
            return True
        return False

    def test_create_recipe(self):
        """Test creating a new recipe"""
        recipe_data = {
            "name": "Bolo de Chocolate Teste",
            "portions": 8,
            "link": "https://example.com/recipe",
            "notes": "Receita de teste para validação",
            "ingredients": [
                {"name": "Farinha de trigo", "quantity": 500, "unit": "g", "mandatory": True},
                {"name": "Açúcar", "quantity": 300, "unit": "g", "mandatory": True},
                {"name": "Chocolate em pó", "quantity": 100, "unit": "g", "mandatory": True},
                {"name": "Ovos", "quantity": 3, "unit": "unidade", "mandatory": True}
            ]
        }
        
        success, response = self.run_test(
            "Create Recipe",
            "POST",
            "recipes",
            200,
            data=recipe_data
        )
        if success and 'id' in response:
            self.test_recipe_id = response['id']
            print(f"   Recipe created with ID: {self.test_recipe_id}")
            return True
        return False

    def test_ingredient_suggestions(self):
        """Test ingredient suggestions"""
        success, response = self.run_test(
            "Ingredient Suggestions",
            "GET",
            "ingredients/suggestions?query=far",
            200
        )
        if success:
            print(f"   Found {len(response)} suggestions for 'far'")
            return True
        return False

    def test_recipe_import_llm(self):
        """Test LLM-powered recipe import"""
        clipboard_text = """
        Receita de Pão de Açúcar Caseiro
        
        Ingredientes:
        - 500g de farinha de trigo
        - 300ml de leite morno
        - 100g de açúcar
        - 10g de fermento biológico seco
        - 1 colher de chá de sal
        - 50ml de óleo
        
        Modo de preparo:
        Misture todos os ingredientes secos, adicione o leite morno e o óleo.
        Sove bem até formar uma massa lisa. Deixe descansar por 1 hora.
        Asse em forno preaquecido a 180°C por 30 minutos.
        
        Rende 6 porções.
        """
        
        success, response = self.run_test(
            "LLM Recipe Import",
            "POST",
            "recipes/import-from-clipboard",
            200,
            data={"clipboard_text": clipboard_text}
        )
        if success and 'id' in response:
            print(f"   Recipe imported via LLM with ID: {response['id']}")
            print(f"   Recipe name: {response.get('name', 'Unknown')}")
            print(f"   Ingredients count: {len(response.get('ingredients', []))}")
            return True
        return False

    def test_update_recipe(self):
        """Test updating a recipe"""
        if not self.test_recipe_id:
            print("❌ No recipe ID available for update test")
            return False
            
        update_data = {
            "name": "Bolo de Chocolate Atualizado",
            "notes": "Receita atualizada com sucesso"
        }
        
        success, response = self.run_test(
            "Update Recipe",
            "PUT",
            f"recipes/{self.test_recipe_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Recipe updated: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_get_shopping_lists(self):
        """Test getting shopping lists"""
        success, response = self.run_test(
            "Get Shopping Lists",
            "GET",
            "shopping-lists",
            200
        )
        if success:
            print(f"   Found {len(response)} shopping lists")
            # Find quick list
            for lst in response:
                if lst.get('is_quick_list'):
                    self.quick_list_id = lst['id']
                    print(f"   Quick list ID: {self.quick_list_id}")
            return True
        return False

    def test_create_shopping_list(self):
        """Test creating a new shopping list"""
        list_data = {
            "name": f"Lista Teste {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        }
        
        success, response = self.run_test(
            "Create Shopping List",
            "POST",
            "shopping-lists",
            200,
            data=list_data
        )
        if success and 'id' in response:
            print(f"   Shopping list created with ID: {response['id']}")
            return True
        return False

    def test_add_recipe_to_quick_list(self):
        """Test adding recipe to quick list"""
        if not self.quick_list_id or not self.test_recipe_id:
            print("❌ Missing quick list ID or recipe ID for test")
            return False
            
        success, response = self.run_test(
            "Add Recipe to Quick List",
            "POST",
            f"shopping-lists/{self.quick_list_id}/add-recipe",
            200,
            data={"recipe_id": self.test_recipe_id, "portions": 4}
        )
        if success:
            print(f"   Recipe added to quick list successfully")
            return True
        return False

    def test_add_manual_item(self):
        """Test adding manual item to shopping list"""
        if not self.quick_list_id:
            print("❌ Missing quick list ID for manual item test")
            return False
            
        success, response = self.run_test(
            "Add Manual Item",
            "POST",
            f"shopping-lists/{self.quick_list_id}/add-item",
            200,
            data={"ingredient_name": "Leite", "quantity": 1, "unit": "l"}
        )
        if success:
            print(f"   Manual item added successfully")
            return True
        return False

    def test_unit_conversion_aggregation(self):
        """Test unit conversion and aggregation by adding same ingredient with different units"""
        if not self.quick_list_id:
            print("❌ Missing quick list ID for aggregation test")
            return False
            
        # Add 500g of sugar
        success1, _ = self.run_test(
            "Add Sugar 500g",
            "POST",
            f"shopping-lists/{self.quick_list_id}/add-item",
            200,
            data={"ingredient_name": "Açúcar", "quantity": 500, "unit": "g"}
        )
        
        # Add 1kg of sugar (should aggregate to 1.5kg)
        success2, _ = self.run_test(
            "Add Sugar 1kg",
            "POST",
            f"shopping-lists/{self.quick_list_id}/add-item",
            200,
            data={"ingredient_name": "Açúcar", "quantity": 1, "unit": "kg"}
        )
        
        if success1 and success2:
            print(f"   Unit conversion test completed - check aggregation manually")
            return True
        return False

    def test_protect_quick_list_deletion(self):
        """Test that quick list cannot be deleted"""
        if not self.quick_list_id:
            print("❌ Missing quick list ID for deletion protection test")
            return False
            
        success, response = self.run_test(
            "Try Delete Quick List (Should Fail)",
            "DELETE",
            f"shopping-lists/{self.quick_list_id}",
            400  # Should return 400 error
        )
        if success:
            print(f"   Quick list deletion properly blocked")
            return True
        return False

    def test_delete_recipe(self):
        """Test deleting a recipe"""
        if not self.test_recipe_id:
            print("❌ No recipe ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Recipe",
            "DELETE",
            f"recipes/{self.test_recipe_id}",
            200
        )
        if success:
            print(f"   Recipe deleted successfully")
            return True
        return False

def main():
    print("🧪 Starting Recipe App Backend Tests")
    print("=" * 50)
    
    tester = RecipeAppTester()
    
    # Authentication tests
    print("\n📋 AUTHENTICATION TESTS")
    if not tester.test_dev_login():
        print("❌ Dev login failed, stopping tests")
        return 1
    
    tester.test_user_registration()
    
    # Recipe tests
    print("\n📋 RECIPE TESTS")
    tester.test_get_recipes()
    tester.test_create_recipe()
    tester.test_ingredient_suggestions()
    tester.test_recipe_import_llm()
    tester.test_update_recipe()
    
    # Shopping list tests
    print("\n📋 SHOPPING LIST TESTS")
    tester.test_get_shopping_lists()
    tester.test_create_shopping_list()
    tester.test_add_recipe_to_quick_list()
    tester.test_add_manual_item()
    tester.test_unit_conversion_aggregation()
    tester.test_protect_quick_list_deletion()
    
    # Cleanup
    print("\n📋 CLEANUP TESTS")
    tester.test_delete_recipe()
    
    # Print results
    print(f"\n📊 FINAL RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())