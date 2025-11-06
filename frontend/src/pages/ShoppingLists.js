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
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Plus, Trash2, Star, Calendar, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function ShoppingLists({ userName, onLogout }) {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const response = await axios.get(`${API}/shopping-lists`);
      setLists(response.data);
    } catch (error) {
      toast.error("Erro ao carregar listas");
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
      // Inicializa porções padrão para cada receita
      const initialSelected = {};
      response.data.forEach(recipe => {
        initialSelected[recipe.id] = { selected: false, portions: recipe.portions };
      });
      setSelectedRecipes(initialSelected);
    } catch (error) {
      toast.error("Erro ao carregar receitas");
    }
  };

  const openCreateDialog = async () => {
    const defaultName = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    setNewListName(defaultName);
    setShowCreateDialog(true);
    await loadRecipes();
  };

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        selected: !prev[recipeId].selected
      }
    }));
  };

  const updatePortions = (recipeId, portions) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        portions: portions
      }
    }));
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("Digite um nome para a lista");
      return;
    }

    const selected = Object.entries(selectedRecipes)
      .filter(([_, data]) => data.selected)
      .map(([id, data]) => ({ recipe_id: id, portions: data.portions }));

    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma receita");
      return;
    }

    setCreatingList(true);
    try {
      // Criar lista vazia
      const createResponse = await axios.post(`${API}/shopping-lists`, { name: newListName });
      const newListId = createResponse.data.id;

      // Adicionar receitas selecionadas
      for (const { recipe_id, portions } of selected) {
        await axios.post(`${API}/shopping-lists/${newListId}/add-recipe`, {
          recipe_id,
          portions
        });
      }

      toast.success("Lista criada com sucesso!");
      setNewListName("");
      setShowCreateDialog(false);
      loadLists();
      navigate(`/listas/${newListId}`);
    } catch (error) {
      toast.error("Erro ao criar lista");
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (listId, listName, isQuickList) => {
    if (isQuickList) {
      toast.error("A lista rápida não pode ser deletada");
      return;
    }

    if (window.confirm(`Tem certeza que deseja deletar a lista "${listName}"?`)) {
      try {
        await axios.delete(`${API}/shopping-lists/${listId}`);
        toast.success("Lista deletada com sucesso");
        loadLists();
      } catch (error) {
        toast.error("Erro ao deletar lista");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Listas de Compras
            </h1>
            <p className="text-gray-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>Organize suas compras</p>
          </div>
          <Button
            data-testid="create-list-button"
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nova Lista
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl text-gray-600">Carregando listas...</div>
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">Nenhuma lista ainda</h2>
            <p className="text-gray-500 mb-6">Crie sua primeira lista de compras!</p>
            <Button
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Lista
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="lists-grid">
            {lists.map((list) => (
              <Card
                key={list.id}
                data-testid={`list-card-${list.id}`}
                className={`hover:shadow-lg transition-all duration-300 border-0 cursor-pointer ${
                  list.is_quick_list
                    ? "bg-gradient-to-br from-green-100 to-emerald-100"
                    : "bg-white/80 backdrop-blur"
                }`}
                onClick={() => navigate(`/listas/${list.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl flex items-center gap-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      {list.is_quick_list && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                      {list.name}
                    </CardTitle>
                    {!list.is_quick_list && (
                      <Button
                        data-testid={`delete-list-${list.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id, list.name, list.is_quick_list);
                        }}
                        className="text-red-600 hover:bg-red-50 -mr-2 -mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(list.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de itens:</span>
                      <span className="font-semibold">{list.items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comprados:</span>
                      <span className="font-semibold text-green-600">
                        {list.items.filter((item) => item.bought).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pendentes:</span>
                      <span className="font-semibold text-orange-600">
                        {list.items.filter((item) => !item.bought).length}
                      </span>
                    </div>
                  </div>

                  {list.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Próximos itens:</p>
                      {list.items.slice(0, 3).map((item, idx) => (
                        <p
                          key={idx}
                          className={`text-xs ${
                            item.bought ? "text-gray-400 line-through" : "text-gray-600"
                          }`}
                        >
                          • {item.ingredient_name}
                        </p>
                      ))}
                      {list.items.length > 3 && (
                        <p className="text-xs text-gray-400 italic mt-1">+ {list.items.length - 3} mais</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    data-testid={`view-list-${list.id}`}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/listas/${list.id}`);
                    }}
                  >
                    Ver Lista Completa
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="create-list-dialog">
          <DialogHeader>
            <DialogTitle>Nova Lista de Compras</DialogTitle>
            <DialogDescription>
              Selecione as receitas e ajuste as porções desejadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="list-name">Nome da Lista</Label>
              <Input
                id="list-name"
                data-testid="list-name-input"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Compras da Semana"
                className="mt-2"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Selecione as Receitas</h3>
              {recipes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Você ainda não tem receitas cadastradas
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className={`border rounded-lg p-3 transition-all ${
                        selectedRecipes[recipe.id]?.selected
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedRecipes[recipe.id]?.selected || false}
                          onCheckedChange={() => toggleRecipeSelection(recipe.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{recipe.name}</h4>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600">Porções:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={selectedRecipes[recipe.id]?.portions || recipe.portions}
                                onChange={(e) => updatePortions(recipe.id, parseInt(e.target.value) || 1)}
                                disabled={!selectedRecipes[recipe.id]?.selected}
                                className="w-20 h-8 text-sm"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            {recipe.ingredients.length} ingredientes • Padrão: {recipe.portions} porções
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingList}>
              Cancelar
            </Button>
            <Button
              data-testid="confirm-create-list-button"
              onClick={handleCreateList}
              disabled={creatingList || recipes.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              {creatingList ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Lista"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ShoppingLists;
