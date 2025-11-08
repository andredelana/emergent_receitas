"""
Script to clear all recipe images from the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

async def clear_all_recipe_images():
    """Clear all imagem_url fields from recipes in database"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Connecting to database...")
    
    # Count recipes with images
    recipes_with_images = await db.recipes.count_documents({"imagem_url": {"$ne": ""}})
    total_recipes = await db.recipes.count_documents({})
    
    print(f"\nTotal recipes: {total_recipes}")
    print(f"Recipes with images: {recipes_with_images}")
    
    if recipes_with_images == 0:
        print("\nNo recipes with images found. Nothing to clear.")
        client.close()
        return
    
    # Clear all images
    print(f"\nClearing images from {recipes_with_images} recipes...")
    result = await db.recipes.update_many(
        {},
        {"$set": {"imagem_url": ""}}
    )
    
    print(f"✓ Updated {result.modified_count} recipes")
    print("\nAll recipe images cleared successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_all_recipe_images())
