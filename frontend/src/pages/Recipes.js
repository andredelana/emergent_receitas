import { useState, useEffect } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Plus, Edit, Trash2, ShoppingCart, LogOut, List } from "lucide-react";
import Navbar from "@/components/Navbar";

function Recipes({ userName, onLogout }) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addToListDialog, setAddToListDialog] = useState(null);
  const [portions, setPortions] = useState(1);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
    } catch (error) {
      toast.error("Erro ao carregar receitas");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recipeId, recipeName) => {
    if (window.confirm(`Tem certeza que deseja deletar "${recipeName}"?`)) {
      try {
        await axios.delete(`${API}/recipes/${recipeId}`);
        toast.success("Receita deletada com sucesso");
        loadRecipes();
      } catch (error) {
        toast.error("Erro ao deletar receita");
      }
    }
  };

  const handleAddToQuickList = async (recipe) => {
    setAddToListDialog(recipe);
    setPortions(recipe.portions);
  };

  const confirmAddToList = async () => {
    if (!addToListDialog) return;

    try {
      // Busca a lista rápida
      const listsResponse = await axios.get(`${API}/shopping-lists`);
      const quickList = listsResponse.data.find((l) => l.is_quick_list);

      if (quickList) {
        await axios.post(`${API}/shopping-lists/${quickList.id}/add-recipe`, {
          recipe_id: addToListDialog.id,
          portions: portions,
        });
        toast.success(`${addToListDialog.name} adicionada à lista rápida!`);
      }
    } catch (error) {
      toast.error("Erro ao adicionar à lista");
    } finally {
      setAddToListDialog(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Minhas Receitas
            </h1>
            <p className="text-gray-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>Gerencie suas receitas favoritas</p>
          </div>
          <Button
            data-testid="create-recipe-button"
            onClick={() => navigate("/receitas/nova")}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nova Receita
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl text-gray-600">Carregando receitas...</div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">Nenhuma receita ainda</h2>
            <p className="text-gray-500 mb-6">Comece criando sua primeira receita!</p>
            <Button
              onClick={() => navigate("/receitas/nova")}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Receita
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="recipes-grid">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur" data-testid={`recipe-card-${recipe.id}`}>
                <CardHeader>
                  <CardTitle className="text-xl" style={{ fontFamily: 'Work Sans, sans-serif' }}>{recipe.name}</CardTitle>
                  <CardDescription>
                    {recipe.portions} porções • {recipe.ingredients.length} ingredientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recipe.notes && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{recipe.notes}</p>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Ingredientes:</p>
                    {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                      <p key={idx} className="text-xs text-gray-600">
                        • {ing.name} ({ing.quantity} {ing.unit})
                      </p>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <p className="text-xs text-gray-400 italic">+ {recipe.ingredients.length - 3} mais</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    data-testid={`add-to-list-${recipe.id}`}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => handleAddToQuickList(recipe)}
                  >
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                  <Button
                    data-testid={`edit-recipe-${recipe.id}`}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => navigate(`/receitas/editar/${recipe.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    data-testid={`delete-recipe-${recipe.id}`}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(recipe.id, recipe.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!addToListDialog} onOpenChange={() => setAddToListDialog(null)}>
        <DialogContent data-testid="add-to-list-dialog">
          <DialogHeader>
            <DialogTitle>Adicionar à Lista Rápida</DialogTitle>
            <DialogDescription>
              Quantas porções de "{addToListDialog?.name}" você deseja?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="portions">Número de porções</Label>
            <Input
              id="portions"
              data-testid="portions-input"
              type="number"
              min="1"
              value={portions}
              onChange={(e) => setPortions(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToListDialog(null)}>Cancelar</Button>
            <Button
              data-testid="confirm-add-to-list-button"
              onClick={confirmAddToList}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Recipes;