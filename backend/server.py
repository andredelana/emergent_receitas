from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 dias

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    username: str
    password: str
    name: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    name: str
    username: str

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    mandatory: bool = True

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    portions: int
    link: Optional[str] = ""
    notes: Optional[str] = ""
    ingredients: List[Ingredient]
    tempo_preparo: Optional[int] = 0  # em minutos
    calorias_por_porcao: Optional[int] = 0
    custo_estimado: Optional[float] = 0.0  # em BRL
    restricoes: List[str] = []  # vegetariano, vegano, sem gluten, sem lactose, etc
    imagem_url: Optional[str] = ""  # URL ou base64 da imagem
    is_suggestion: bool = False  # True se é uma receita sugerida pelo sistema
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    name: str
    portions: int
    link: Optional[str] = ""
    notes: Optional[str] = ""
    ingredients: List[Ingredient]
    tempo_preparo: Optional[int] = 0
    calorias_por_porcao: Optional[int] = 0
    custo_estimado: Optional[float] = 0.0
    restricoes: List[str] = []
    imagem_url: Optional[str] = ""

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    portions: Optional[int] = None
    link: Optional[str] = None
    notes: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
    tempo_preparo: Optional[int] = None
    calorias_por_porcao: Optional[int] = None
    custo_estimado: Optional[float] = None
    restricoes: Optional[List[str]] = None
    imagem_url: Optional[str] = None

class ImportRecipeRequest(BaseModel):
    clipboard_text: str

class ShoppingItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ingredient_name: str
    quantity: float
    unit: str
    bought: bool = False
    recipe_ids: List[str] = []
    recipe_names: List[str] = []

class ShoppingList(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    is_quick_list: bool = False
    items: List[ShoppingItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShoppingListCreate(BaseModel):
    name: str

class AddRecipeToList(BaseModel):
    recipe_id: str
    portions: int

class AddManualItem(BaseModel):
    ingredient_name: str
    quantity: float
    unit: str

class UpdateShoppingItem(BaseModel):
    bought: Optional[bool] = None

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# Conversões de unidades
def convert_unit(quantity: float, from_unit: str, to_unit: str) -> tuple[float, str]:
    """Converte quantidade entre unidades compatíveis"""
    from_unit = from_unit.lower().strip()
    to_unit = to_unit.lower().strip()
    
    # Massa
    mass_conversions = {
        'g': 1,
        'grama': 1,
        'gramas': 1,
        'kg': 1000,
        'kilo': 1000,
        'quilograma': 1000,
        'quilogramas': 1000,
        'mg': 0.001,
        'miligrama': 0.001,
        'miligramas': 0.001
    }
    
    # Volume
    volume_conversions = {
        'ml': 1,
        'mililitro': 1,
        'mililitros': 1,
        'l': 1000,
        'litro': 1000,
        'litros': 1000,
        'cl': 10,
        'centilitro': 10,
        'centilitros': 10
    }
    
    # Verifica se são da mesma categoria
    if from_unit in mass_conversions and to_unit in mass_conversions:
        # Converte para gramas, depois para unidade destino
        in_grams = quantity * mass_conversions[from_unit]
        result = in_grams / mass_conversions[to_unit]
        return result, to_unit
    elif from_unit in volume_conversions and to_unit in volume_conversions:
        # Converte para ml, depois para unidade destino
        in_ml = quantity * volume_conversions[from_unit]
        result = in_ml / volume_conversions[to_unit]
        return result, to_unit
    
    # Unidades incompatíveis ou desconhecidas
    return quantity, from_unit

def normalize_unit(unit: str) -> str:
    """Normaliza unidade para forma padrão"""
    unit_lower = unit.lower().strip()
    
    mass_map = {
        'g': 'g', 'grama': 'g', 'gramas': 'g',
        'kg': 'kg', 'kilo': 'kg', 'quilograma': 'kg', 'quilogramas': 'kg',
        'mg': 'mg', 'miligrama': 'mg', 'miligramas': 'mg'
    }
    
    volume_map = {
        'ml': 'ml', 'mililitro': 'ml', 'mililitros': 'ml',
        'l': 'l', 'litro': 'l', 'litros': 'l',
        'cl': 'cl', 'centilitro': 'cl', 'centilitros': 'cl'
    }
    
    if unit_lower in mass_map:
        return mass_map[unit_lower]
    elif unit_lower in volume_map:
        return volume_map[unit_lower]
    
    return unit

def get_best_unit(quantity: float, unit: str) -> tuple[float, str]:
    """Retorna a melhor unidade para display"""
    unit_normalized = normalize_unit(unit)
    
    # Para massa
    if unit_normalized == 'g':
        if quantity >= 1000:
            return round(quantity / 1000, 2), 'kg'
    elif unit_normalized == 'kg':
        if quantity < 1:
            return round(quantity * 1000, 2), 'g'
    
    # Para volume
    if unit_normalized == 'ml':
        if quantity >= 1000:
            return round(quantity / 1000, 2), 'l'
    elif unit_normalized == 'l':
        if quantity < 1:
            return round(quantity * 1000, 2), 'ml'
    
    # Arredonda para 2 casas decimais
    return round(quantity, 2), unit_normalized

def normalize_ingredient_name(name: str) -> str:
    """Normaliza nome do ingrediente removendo acentos e espaços extras"""
    import unicodedata
    # Remove acentos
    normalized = unicodedata.normalize('NFKD', name)
    normalized = normalized.encode('ASCII', 'ignore').decode('ASCII')
    # Remove espaços extras e converte para minúscula
    return ' '.join(normalized.lower().strip().split())

async def aggregate_ingredients(items: List[ShoppingItem]) -> List[ShoppingItem]:
    """Agrega ingredientes com mesmo nome, convertendo unidades quando necessário"""
    aggregated = {}
    
    for item in items:
        key = normalize_ingredient_name(item.ingredient_name)
        
        if key not in aggregated:
            # Normaliza a unidade
            unit_norm = normalize_unit(item.unit)
            aggregated[key] = {
                'ingredient_name': item.ingredient_name,
                'quantity': item.quantity,
                'unit': unit_norm,
                'bought': item.bought,
                'recipe_ids': item.recipe_ids.copy(),
                'recipe_names': item.recipe_names.copy(),
                'id': item.id
            }
        else:
            # Tenta agregar
            existing = aggregated[key]
            try:
                converted_qty, converted_unit = convert_unit(
                    item.quantity, 
                    item.unit, 
                    existing['unit']
                )
                if converted_unit == existing['unit']:
                    existing['quantity'] += converted_qty
                    # Adiciona recipe_ids ao item existente
                    for rid in item.recipe_ids:
                        if rid not in existing['recipe_ids']:
                            existing['recipe_ids'].append(rid)
                    for rname in item.recipe_names:
                        if rname not in existing['recipe_names']:
                            existing['recipe_names'].append(rname)
                else:
                    # Unidades incompatíveis, mantém separado com sufixo
                    new_key = f"{key}_{normalize_unit(item.unit)}"
                    aggregated[new_key] = {
                        'ingredient_name': item.ingredient_name,
                        'quantity': item.quantity,
                        'unit': normalize_unit(item.unit),
                        'bought': item.bought,
                        'recipe_ids': item.recipe_ids.copy(),
                        'recipe_names': item.recipe_names.copy(),
                        'id': str(uuid.uuid4())
                    }
            except:
                # Mantém separado em caso de erro
                new_key = f"{key}_{normalize_unit(item.unit)}"
                aggregated[new_key] = {
                    'ingredient_name': item.ingredient_name,
                    'quantity': item.quantity,
                    'unit': normalize_unit(item.unit),
                    'bought': item.bought,
                    'recipe_ids': item.recipe_ids.copy(),
                    'recipe_names': item.recipe_names.copy(),
                    'id': str(uuid.uuid4())
                }
    
    # Otimiza unidades para melhor visualização
    result = []
    for data in aggregated.values():
        best_qty, best_unit = get_best_unit(data['quantity'], data['unit'])
        result.append(ShoppingItem(
            id=data['id'],
            ingredient_name=data['ingredient_name'],
            quantity=best_qty,
            unit=best_unit,
            bought=data['bought'],
            recipe_ids=data['recipe_ids'],
            recipe_names=data['recipe_names']
        ))
    
    return result

# Auth endpoints
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Verifica se username já existe
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "password_hash": hashed_pwd,
        "name": user_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Cria lista rápida padrão
    quick_list = ShoppingList(
        user_id=user_id,
        name="Lista Rápida",
        is_quick_list=True
    )
    list_doc = quick_list.model_dump()
    list_doc['created_at'] = list_doc['created_at'].isoformat()
    await db.shopping_lists.insert_one(list_doc)
    
    token = create_token(user_id, user_data.username)
    return TokenResponse(token=token, name=user_data.name, username=user_data.username)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    
    # Dev login especial
    if credentials.username == "dev" and credentials.password == "55555":
        if not user:
            # Cria usuário dev
            user_id = str(uuid.uuid4())
            user_doc = {
                "id": user_id,
                "username": "dev",
                "password_hash": hash_password("55555"),
                "name": "Dev",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            
            # Cria lista rápida
            quick_list = ShoppingList(
                user_id=user_id,
                name="Lista Rápida",
                is_quick_list=True
            )
            list_doc = quick_list.model_dump()
            list_doc['created_at'] = list_doc['created_at'].isoformat()
            await db.shopping_lists.insert_one(list_doc)
            
            token = create_token(user_id, "dev")
            return TokenResponse(token=token, name="Dev", username="dev")
        else:
            token = create_token(user['id'], user['username'])
            return TokenResponse(token=token, name=user['name'], username=user['username'])
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user['id'], user['username'])
    return TokenResponse(token=token, name=user['name'], username=user['username'])

# Helper function para estimar valores com LLM
async def estimate_recipe_values(recipe_data: dict) -> dict:
    """Estima tempo, calorias, custo e restrições usando LLM"""
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return recipe_data
        
        # Prepara os ingredientes para o prompt
        ingredients_text = "\n".join([
            f"- {ing['name']}: {ing['quantity']} {ing['unit']}"
            for ing in recipe_data.get('ingredients', [])
        ])
        
        # Prompt para o LLM
        prompt = f"""Analise a seguinte receita e estime os valores solicitados:

Nome: {recipe_data.get('name', 'Sem nome')}
Porções: {recipe_data.get('portions', 1)}
Ingredientes:
{ingredients_text}

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem nenhum texto adicional antes ou depois.

Formato EXATO do JSON:
{{
  "tempo_preparo": 30,
  "calorias_por_porcao": 450,
  "custo_estimado": 25.50,
  "restricoes": ["vegetariano"]
}}

Regras:
- tempo_preparo: número inteiro em minutos (tempo total de preparo)
- calorias_por_porcao: número inteiro de calorias por porção
- custo_estimado: número decimal do custo total em BRL (considere preços médios brasileiros)
- restricoes: array de strings. Use APENAS: "vegetariano", "vegano", "sem gluten", "sem lactose" quando aplicável

Se a receita não tiver restrições, retorne array vazio []"""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"estimate-{uuid.uuid4()}",
            system_message="Você é um especialista em nutrição e culinária. Retorne APENAS JSON válido, sem texto adicional."
        ).with_model("openai", "gpt-4o")
        
        from emergentintegrations.llm.chat import UserMessage
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON da resposta
        import json
        logger.info(f"LLM Response: {response[:200]}")  # Log primeiros 200 chars
        
        clean_response = response.strip()
        
        # Remove markdown code blocks
        if '```json' in clean_response.lower():
            clean_response = re.sub(r'```json\s*', '', clean_response, flags=re.IGNORECASE)
            clean_response = re.sub(r'```\s*$', '', clean_response)
        elif clean_response.startswith('```'):
            clean_response = re.sub(r'^```[^\n]*\n', '', clean_response)
            clean_response = re.sub(r'\n```$', '', clean_response)
        
        # Remove espaços e quebras de linha extras
        clean_response = clean_response.strip()
        
        logger.info(f"Clean Response: {clean_response[:200]}")
        
        # Tenta parsear o JSON
        try:
            estimated_values = json.loads(clean_response)
        except json.JSONDecodeError:
            # Se falhar, tenta encontrar JSON no meio do texto
            json_match = re.search(r'\{[^{}]*"tempo_preparo"[^{}]*\}', clean_response, re.DOTALL)
            if json_match:
                estimated_values = json.loads(json_match.group())
            else:
                raise ValueError("Não foi possível extrair JSON da resposta")
        
        logger.info(f"Estimated values: {estimated_values}")
        
        # Atualiza apenas os campos que estão vazios ou zero
        if recipe_data.get('tempo_preparo', 0) == 0:
            recipe_data['tempo_preparo'] = estimated_values.get('tempo_preparo', 0)
        
        if recipe_data.get('calorias_por_porcao', 0) == 0:
            recipe_data['calorias_por_porcao'] = estimated_values.get('calorias_por_porcao', 0)
        
        if recipe_data.get('custo_estimado', 0) == 0:
            recipe_data['custo_estimado'] = estimated_values.get('custo_estimado', 0.0)
        
        if not recipe_data.get('restricoes') or len(recipe_data.get('restricoes', [])) == 0:
            recipe_data['restricoes'] = estimated_values.get('restricoes', [])
        
        return recipe_data
        
    except Exception as e:
        logger.error(f"Erro ao estimar valores com LLM: {str(e)}")
        # Em caso de erro, retorna os dados originais
        return recipe_data

# Helper function para gerar imagem com AI
async def generate_recipe_image(recipe_data: dict) -> str:
    """Gera imagem da receita usando AI"""
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return ""
        
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        import base64
        
        # Prepara prompt descritivo
        ingredients_list = ", ".join([ing['name'] for ing in recipe_data.get('ingredients', [])[:5]])
        
        prompt = f"""A beautifully plated dish of {recipe_data.get('name', 'food')}, professional food photography, 
appetizing presentation, natural lighting, close-up view showing the main ingredients: {ingredients_list}. 
High quality, restaurant style, vibrant colors, appetizing."""
        
        logger.info(f"Generating image for recipe: {recipe_data.get('name')}")
        
        # Gera imagem
        image_gen = OpenAIImageGeneration(api_key=llm_key)
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            # Converte para base64
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            image_data_url = f"data:image/png;base64,{image_base64}"
            logger.info(f"Image generated successfully for recipe: {recipe_data.get('name')}")
            return image_data_url
        
        return ""
        
    except Exception as e:
        logger.error(f"Erro ao gerar imagem com AI: {str(e)}")
        return ""

# Recipe endpoints
@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes(user_id: str = Depends(get_current_user)):
    recipes = await db.recipes.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for recipe in recipes:
        if isinstance(recipe['created_at'], str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    return recipes

@api_router.post("/recipes", response_model=Recipe)
async def create_recipe(recipe_data: RecipeCreate, user_id: str = Depends(get_current_user)):
    recipe_dict = recipe_data.model_dump()
    recipe_dict['user_id'] = user_id
    
    # Estima valores com LLM se necessário
    recipe_dict = await estimate_recipe_values(recipe_dict)
    
    # Gera imagem com AI se não houver uma
    if not recipe_dict.get('imagem_url'):
        recipe_dict['imagem_url'] = await generate_recipe_image(recipe_dict)
    
    recipe = Recipe(**recipe_dict)
    recipe_doc = recipe.model_dump()
    recipe_doc['created_at'] = recipe_doc['created_at'].isoformat()
    await db.recipes.insert_one(recipe_doc)
    return recipe

@api_router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, recipe_data: RecipeUpdate, user_id: str = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id, "user_id": user_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    update_data = {k: v for k, v in recipe_data.model_dump().items() if v is not None}
    
    if update_data:
        # Merge com dados existentes para estimativa
        merged_data = {**recipe, **update_data}
        
        # Verifica se precisa estimar (campos vazios ou foram alterados ingredientes)
        needs_estimation = (
            merged_data.get('tempo_preparo', 0) == 0 or
            merged_data.get('calorias_por_porcao', 0) == 0 or
            merged_data.get('custo_estimado', 0) == 0 or
            not merged_data.get('restricoes') or
            'ingredients' in update_data  # Ingredientes foram alterados
        )
        
        if needs_estimation:
            merged_data = await estimate_recipe_values(merged_data)
            # Atualiza apenas os campos estimados
            update_data['tempo_preparo'] = merged_data.get('tempo_preparo')
            update_data['calorias_por_porcao'] = merged_data.get('calorias_por_porcao')
            update_data['custo_estimado'] = merged_data.get('custo_estimado')
            update_data['restricoes'] = merged_data.get('restricoes')
        
        # Gera imagem SEMPRE que não houver uma (independente de outras alterações)
        if not merged_data.get('imagem_url') and 'imagem_url' not in update_data:
            logger.info(f"Recipe {recipe_id} has no image, generating one...")
            new_image = await generate_recipe_image(merged_data)
            if new_image:
                update_data['imagem_url'] = new_image
                logger.info(f"Image generated for recipe {recipe_id}")
        elif 'ingredients' in update_data and merged_data.get('imagem_url') and 'imagem_url' not in update_data:
            # Regenera imagem se ingredientes foram alterados (opcional)
            logger.info(f"Recipe {recipe_id} ingredients changed, regenerating image...")
            new_image = await generate_recipe_image(merged_data)
            if new_image:
                update_data['imagem_url'] = new_image
                logger.info(f"Image regenerated for recipe {recipe_id}")
        
        await db.recipes.update_one({"id": recipe_id}, {"$set": update_data})
    
    updated_recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if isinstance(updated_recipe['created_at'], str):
        updated_recipe['created_at'] = datetime.fromisoformat(updated_recipe['created_at'])
    return Recipe(**updated_recipe)

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user_id: str = Depends(get_current_user)):
    result = await db.recipes.delete_one({"id": recipe_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return {"message": "Receita deletada com sucesso"}

@api_router.get("/ingredients/suggestions")
async def get_ingredient_suggestions(query: str, user_id: str = Depends(get_current_user)):
    if not query or len(query) < 2:
        return []
    
    recipes = await db.recipes.find({"user_id": user_id}, {"_id": 0, "ingredients": 1}).to_list(1000)
    
    suggestions = set()
    query_lower = query.lower()
    
    for recipe in recipes:
        for ing in recipe.get('ingredients', []):
            name = ing.get('name', '')
            if query_lower in name.lower():
                suggestions.add(name)
    
    return sorted(list(suggestions))[:10]

@api_router.post("/recipes/import-from-clipboard", response_model=Recipe)
async def import_recipe_from_clipboard(data: ImportRecipeRequest, user_id: str = Depends(get_current_user)):
    try:
        # Usa LLM para extrair receita
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(status_code=500, detail="Chave LLM não configurada")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"import-{user_id}-{uuid.uuid4()}",
            system_message="""Você é um assistente que extrai receitas de textos.
            Retorne APENAS um JSON válido no seguinte formato:
            {
                "name": "Nome da Receita",
                "portions": 4,
                "link": "",
                "notes": "Observações sobre a receita",
                "ingredients": [
                    {"name": "Farinha de trigo", "quantity": 500, "unit": "g", "mandatory": true},
                    {"name": "Açúcar", "quantity": 200, "unit": "g", "mandatory": true}
                ]
            }
            
            IMPORTANTE:
            - Retorne APENAS o JSON, sem texto adicional
            - Se não conseguir extrair alguma informação, use valores padrão
            - portions deve ser um número inteiro
            - quantity deve ser um número (pode ser decimal)
            - mandatory deve ser boolean (true para ingredientes principais, false para opcionais)
            """
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Extraia a receita do seguinte texto:\n\n{data.clipboard_text}"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON da resposta
        import json
        # Remove markdown code blocks se existirem
        clean_response = response.strip()
        if clean_response.startswith('```'):
            clean_response = re.sub(r'^```[\w]*\n', '', clean_response)
            clean_response = re.sub(r'\n```$', '', clean_response)
        
        recipe_data = json.loads(clean_response)
        
        # Cria receita
        recipe_create = RecipeCreate(**recipe_data)
        recipe = Recipe(user_id=user_id, **recipe_create.model_dump())
        recipe_doc = recipe.model_dump()
        recipe_doc['created_at'] = recipe_doc['created_at'].isoformat()
        await db.recipes.insert_one(recipe_doc)
        
        return recipe
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar resposta do LLM: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao importar receita: {str(e)}")

# Shopping list endpoints
@api_router.get("/shopping-lists", response_model=List[ShoppingList])
async def get_shopping_lists(user_id: str = Depends(get_current_user)):
    lists = await db.shopping_lists.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for lst in lists:
        if isinstance(lst['created_at'], str):
            lst['created_at'] = datetime.fromisoformat(lst['created_at'])
    # Ordena: lista rápida primeiro, depois por data
    lists.sort(key=lambda x: (not x['is_quick_list'], x['created_at']), reverse=True)
    return lists

@api_router.post("/shopping-lists", response_model=ShoppingList)
async def create_shopping_list(list_data: ShoppingListCreate, user_id: str = Depends(get_current_user)):
    shopping_list = ShoppingList(user_id=user_id, name=list_data.name, is_quick_list=False)
    list_doc = shopping_list.model_dump()
    list_doc['created_at'] = list_doc['created_at'].isoformat()
    await db.shopping_lists.insert_one(list_doc)
    return shopping_list

@api_router.delete("/shopping-lists/{list_id}")
async def delete_shopping_list(list_id: str, user_id: str = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    if shopping_list.get('is_quick_list'):
        raise HTTPException(status_code=400, detail="Não é possível deletar a lista rápida")
    
    await db.shopping_lists.delete_one({"id": list_id})
    return {"message": "Lista deletada com sucesso"}

@api_router.post("/shopping-lists/{list_id}/add-recipe")
async def add_recipe_to_list(list_id: str, data: AddRecipeToList, user_id: str = Depends(get_current_user)):
    # Busca lista
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    # Busca receita
    recipe = await db.recipes.find_one({"id": data.recipe_id, "user_id": user_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    # Calcula proporção
    portion_multiplier = data.portions / recipe['portions']
    
    # Adiciona ingredientes à lista
    current_items = [ShoppingItem(**item) for item in shopping_list.get('items', [])]
    
    for ing in recipe['ingredients']:
        new_item = ShoppingItem(
            ingredient_name=ing['name'],
            quantity=ing['quantity'] * portion_multiplier,
            unit=ing['unit'],
            bought=False,
            recipe_ids=[recipe['id']],
            recipe_names=[recipe['name']]
        )
        current_items.append(new_item)
    
    # Agrega ingredientes
    aggregated_items = await aggregate_ingredients(current_items)
    
    # Atualiza lista
    items_doc = [item.model_dump() for item in aggregated_items]
    await db.shopping_lists.update_one(
        {"id": list_id},
        {"$set": {"items": items_doc}}
    )
    
    return {"message": "Receita adicionada à lista"}

@api_router.post("/shopping-lists/{list_id}/add-item")
async def add_manual_item(list_id: str, item_data: AddManualItem, user_id: str = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    new_item = ShoppingItem(
        ingredient_name=item_data.ingredient_name,
        quantity=item_data.quantity,
        unit=item_data.unit,
        bought=False,
        recipe_ids=[],
        recipe_names=[]
    )
    
    current_items = [ShoppingItem(**item) for item in shopping_list.get('items', [])]
    current_items.append(new_item)
    
    # Agrega
    aggregated_items = await aggregate_ingredients(current_items)
    items_doc = [item.model_dump() for item in aggregated_items]
    
    await db.shopping_lists.update_one(
        {"id": list_id},
        {"$set": {"items": items_doc}}
    )
    
    return {"message": "Item adicionado"}

@api_router.put("/shopping-lists/{list_id}/items/{item_id}")
async def update_shopping_item(list_id: str, item_id: str, item_data: UpdateShoppingItem, user_id: str = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    items = shopping_list.get('items', [])
    item_found = False
    
    for item in items:
        if item['id'] == item_id:
            if item_data.bought is not None:
                item['bought'] = item_data.bought
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    await db.shopping_lists.update_one(
        {"id": list_id},
        {"$set": {"items": items}}
    )
    
    return {"message": "Item atualizado"}

@api_router.delete("/shopping-lists/{list_id}/items/{item_id}")
async def delete_shopping_item(list_id: str, item_id: str, user_id: str = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    items = [item for item in shopping_list.get('items', []) if item['id'] != item_id]
    
    await db.shopping_lists.update_one(
        {"id": list_id},
        {"$set": {"items": items}}
    )
    
    return {"message": "Item removido"}

@api_router.post("/shopping-lists/{list_id}/clear-bought")
async def clear_bought_items(list_id: str, user_id: str = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id, "user_id": user_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    
    items = [item for item in shopping_list.get('items', []) if not item.get('bought', False)]
    
    await db.shopping_lists.update_one(
        {"id": list_id},
        {"$set": {"items": items}}
    )
    
    return {"message": "Itens comprados removidos"}

# Helper function para gerar sugestões de receitas com LLM
async def generate_recipe_suggestions(user_id: str) -> List[Recipe]:
    """Gera 5 sugestões de receitas baseadas nos ingredientes do usuário"""
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return []
        
        # Busca receitas do usuário para extrair ingredientes
        user_recipes = await db.recipes.find(
            {"user_id": user_id, "is_suggestion": False}, 
            {"_id": 0, "ingredients": 1}
        ).to_list(1000)
        
        if len(user_recipes) == 0:
            return []
        
        # Extrai ingredientes únicos
        all_ingredients = set()
        for recipe in user_recipes:
            for ing in recipe.get('ingredients', []):
                all_ingredients.add(ing['name'].lower().strip())
        
        if len(all_ingredients) < 3:
            return []
        
        ingredients_list = ", ".join(sorted(list(all_ingredients))[:20])  # Max 20 ingredientes
        
        # Prompt para o LLM
        prompt = f"""Crie 5 receitas BRASILEIRAS deliciosas usando principalmente estes ingredientes que o usuário já conhece:
{ingredients_list}

IMPORTANTE: Retorne APENAS um array JSON válido, sem texto adicional.

Formato EXATO:
[
  {{
    "name": "Nome da Receita",
    "portions": 4,
    "notes": "Descrição breve e apetitosa da receita",
    "ingredients": [
      {{"name": "ingrediente1", "quantity": 200, "unit": "g", "mandatory": true}},
      {{"name": "ingrediente2", "quantity": 1, "unit": "unidade", "mandatory": true}}
    ]
  }}
]

Regras:
- Criar receitas variadas (prato principal, sobremesa, lanche, etc)
- Usar principalmente ingredientes da lista fornecida
- Pode adicionar 1-2 ingredientes básicos extras se necessário
- portions: número inteiro (2-8)
- Cada receita deve ter 4-8 ingredientes
- notes: 1-2 frases descritivas
- Receitas devem ser realistas e práticas"""

        logger.info(f"Generating recipe suggestions for user {user_id}")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"suggestions-{user_id}-{uuid.uuid4()}",
            system_message="Você é um chef brasileiro especialista. Retorne APENAS JSON válido."
        ).with_model("openai", "gpt-4o")
        
        from emergentintegrations.llm.chat import UserMessage
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON
        import json
        clean_response = response.strip()
        
        # Remove markdown
        if '```json' in clean_response.lower():
            clean_response = re.sub(r'```json\s*', '', clean_response, flags=re.IGNORECASE)
            clean_response = re.sub(r'```\s*$', '', clean_response)
        elif clean_response.startswith('```'):
            clean_response = re.sub(r'^```[^\n]*\n', '', clean_response)
            clean_response = re.sub(r'\n```$', '', clean_response)
        
        clean_response = clean_response.strip()
        
        recipes_data = json.loads(clean_response)
        
        # Cria as receitas no banco
        created_recipes = []
        for recipe_data in recipes_data[:5]:  # Garante máximo 5
            # Adiciona campos obrigatórios
            recipe_data['user_id'] = user_id
            recipe_data['link'] = ""
            recipe_data['tempo_preparo'] = 0
            recipe_data['calorias_por_porcao'] = 0
            recipe_data['custo_estimado'] = 0.0
            recipe_data['restricoes'] = []
            recipe_data['imagem_url'] = ""
            recipe_data['is_suggestion'] = True
            
            # Estima valores
            recipe_data = await estimate_recipe_values(recipe_data)
            
            # Gera imagem
            recipe_data['imagem_url'] = await generate_recipe_image(recipe_data)
            
            # Cria receita
            recipe = Recipe(**recipe_data)
            recipe_doc = recipe.model_dump()
            recipe_doc['created_at'] = recipe_doc['created_at'].isoformat()
            await db.recipes.insert_one(recipe_doc)
            
            created_recipes.append(recipe)
            logger.info(f"Created suggestion recipe: {recipe.name}")
        
        # Atualiza timestamp da última geração
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"last_suggestions_date": datetime.now(timezone.utc).date().isoformat()}}
        )
        
        logger.info(f"Generated {len(created_recipes)} recipe suggestions for user {user_id}")
        return created_recipes
        
    except Exception as e:
        logger.error(f"Erro ao gerar sugestões de receitas: {str(e)}")
        return []

# Home page endpoints
@api_router.get("/home/favorites", response_model=List[Recipe])
async def get_favorite_recipes(user_id: str = Depends(get_current_user)):
    """Retorna receitas favoritas (mais adicionadas às listas pelo usuário)"""
    # Busca todas as listas do usuário
    lists = await db.shopping_lists.find({"user_id": user_id}, {"_id": 0, "items": 1}).to_list(1000)
    
    # Conta quantas vezes cada receita foi adicionada
    recipe_count = {}
    for lst in lists:
        for item in lst.get('items', []):
            for recipe_id in item.get('recipe_ids', []):
                recipe_count[recipe_id] = recipe_count.get(recipe_id, 0) + 1
    
    # Ordena por contagem e pega top 6
    top_recipe_ids = sorted(recipe_count.items(), key=lambda x: x[1], reverse=True)[:6]
    top_ids = [rid for rid, _ in top_recipe_ids]
    
    if not top_ids:
        return []
    
    # Busca as receitas
    recipes = await db.recipes.find({"id": {"$in": top_ids}, "user_id": user_id}, {"_id": 0}).to_list(6)
    for recipe in recipes:
        if isinstance(recipe['created_at'], str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipes

@api_router.get("/home/suggestions", response_model=List[Recipe])
async def get_suggested_recipes(user_id: str = Depends(get_current_user)):
    """Retorna sugestões de receitas geradas com LLM (1x por dia)"""
    
    # Busca receitas não-sugeridas do usuário
    user_recipes = await db.recipes.find(
        {"user_id": user_id, "is_suggestion": False}, 
        {"_id": 0}
    ).to_list(1000)
    
    if len(user_recipes) < 2:
        return []
    
    # Verifica se já gerou sugestões hoje
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    today = datetime.now(timezone.utc).date().isoformat()
    last_suggestions_date = user.get('last_suggestions_date') if user else None
    
    # Se não gerou hoje, busca sugestões existentes primeiro
    existing_suggestions = await db.recipes.find(
        {"user_id": user_id, "is_suggestion": True},
        {"_id": 0}
    ).to_list(10)
    
    # Processa datas
    for recipe in existing_suggestions:
        if isinstance(recipe['created_at'], str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    # Se precisa gerar novas (primeira vez do dia ou não tem nenhuma)
    if last_suggestions_date != today or len(existing_suggestions) == 0:
        logger.info(f"Generating new suggestions for user {user_id}")
        
        # Remove sugestões antigas
        if len(existing_suggestions) > 0:
            await db.recipes.delete_many({"user_id": user_id, "is_suggestion": True})
        
        # Gera novas sugestões
        new_suggestions = await generate_recipe_suggestions(user_id)
        return new_suggestions
    
    # Retorna sugestões existentes
    return existing_suggestions[:5]

@api_router.get("/home/trending", response_model=List[Recipe])
async def get_trending_recipes(user_id: str = Depends(get_current_user)):
    """Retorna receitas em tendência (mais adicionadas globalmente)"""
    # Busca todas as listas de todos os usuários
    all_lists = await db.shopping_lists.find({}, {"_id": 0, "items": 1}).to_list(10000)
    
    # Conta quantas vezes cada receita foi adicionada globalmente
    global_recipe_count = {}
    for lst in all_lists:
        for item in lst.get('items', []):
            for recipe_id in item.get('recipe_ids', []):
                global_recipe_count[recipe_id] = global_recipe_count.get(recipe_id, 0) + 1
    
    # Ordena por contagem e pega top 6
    top_recipe_ids = sorted(global_recipe_count.items(), key=lambda x: x[1], reverse=True)[:6]
    top_ids = [rid for rid, _ in top_recipe_ids]
    
    if not top_ids:
        # Se não houver dados, retorna receitas aleatórias
        recipes = await db.recipes.find({}, {"_id": 0}).to_list(6)
    else:
        # Busca as receitas (de qualquer usuário)
        recipes = await db.recipes.find({"id": {"$in": top_ids}}, {"_id": 0}).to_list(6)
    
    for recipe in recipes:
        if isinstance(recipe['created_at'], str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipes

@api_router.post("/recipes/{recipe_id}/copy")
async def copy_recipe_to_my_recipes(recipe_id: str, user_id: str = Depends(get_current_user)):
    """Copia uma receita para as receitas do usuário"""
    # Busca a receita original
    original_recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not original_recipe:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    # Verifica se já não é do usuário
    if original_recipe['user_id'] == user_id:
        return {"message": "Receita já está nas suas receitas", "recipe_id": recipe_id}
    
    # Cria uma cópia para o usuário
    new_recipe = Recipe(
        user_id=user_id,
        name=original_recipe['name'],
        portions=original_recipe['portions'],
        link=original_recipe.get('link', ''),
        notes=original_recipe.get('notes', ''),
        ingredients=[Ingredient(**ing) for ing in original_recipe['ingredients']]
    )
    
    recipe_doc = new_recipe.model_dump()
    recipe_doc['created_at'] = recipe_doc['created_at'].isoformat()
    await db.recipes.insert_one(recipe_doc)
    
    return {"message": "Receita adicionada às suas receitas", "recipe_id": new_recipe.id}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()