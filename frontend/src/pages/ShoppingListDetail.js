import { useState, useEffect } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Star, Sparkles, Edit, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";

const UNITS = [
  "g", "kg", "mg",
  "ml", "l", "cl",
  "colher (sopa)", "colher (chá)", "xícara",
  "unidade", "pitada", "a gosto"
];

// Componente para edição inline de item da lista
function EditItemRow({ item, onSave, onCancel }) {
  const [editData, setEditData] = useState({
    ingredient_name: item.ingredient_name,
    quantity: item.quantity,
    unit: item.unit
  });

  return (
    <div className="bg-amber-50 p-3 rounded-lg border-2 border-amber-300">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-6">
          <Label className="text-xs">Nome do Item</Label>
          <Input
            value={editData.ingredient_name}
            onChange={(e) => setEditData({ ...editData, ingredient_name: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Quantidade</Label>
          <Input
            type="number"
            step="0.01"
            value={editData.quantity}
            onChange={(e) => setEditData({ ...editData, quantity: parseFloat(e.target.value) })}
            className="h-9 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Unidade</Label>
          <Select value={editData.unit} onValueChange={(value) => setEditData({ ...editData, unit: value })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 flex gap-1">
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(editData)}
            className="h-9 flex-1 bg-green-500 hover:bg-green-600"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-9 flex-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShoppingListDetail({ userName, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showAddRecipeDialog, setShowAddRecipeDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [addingRecipes, setAddingRecipes] = useState(false);
  const [newItem, setNewItem] = useState({
    ingredient_name: "",
    quantity: "",
    unit: "g"
  });

  useEffect(() => {
    loadList();
  }, [id]);

  const loadList = async () => {
    try {
      const response = await axios.get(`${API}/shopping-lists`);
      const foundList = response.data.find((l) => l.id === id);
      if (foundList) {
        setList(foundList);
      } else {
        toast.error("Lista não encontrada");
        navigate("/listas");
      }
    } catch (error) {
      toast.error("Erro ao carregar lista");
      navigate("/listas");
    } finally {
      setLoading(false);
    }
  };

  const toggleItemBought = async (itemId, currentStatus) => {
    try {
      await axios.put(`${API}/shopping-lists/${id}/items/${itemId}`, {
        bought: !currentStatus
      });
      loadList();
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`${API}/shopping-lists/${id}/items/${itemId}`);
      toast.success("Item removido");
      loadList();
    } catch (error) {
      toast.error("Erro ao remover item");
    }
  };

  const handleAddItem = async () => {
    if (!newItem.ingredient_name || !newItem.quantity) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await axios.post(`${API}/shopping-lists/${id}/add-item`, {
        ingredient_name: newItem.ingredient_name,
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit
      });
      toast.success("Item adicionado");
      setNewItem({ ingredient_name: "", quantity: "", unit: "g" });
      setShowAddItemDialog(false);
      loadList();
    } catch (error) {
      toast.error("Erro ao adicionar item");
    }
  };

  const clearBoughtItems = async () => {
    if (window.confirm("Tem certeza que deseja remover todos os itens comprados?")) {
      try {
        await axios.post(`${API}/shopping-lists/${id}/clear-bought`);
        toast.success("Itens comprados removidos");
        loadList();
      } catch (error) {
        toast.error("Erro ao limpar itens");
      }
    }
  };

  const startEditItem = (itemId) => {
    setEditingItemId(itemId);
  };

  const saveEditItem = async (itemId, updatedData) => {
    try {
      const item = list.items.find(i => i.id === itemId);
      
      // Deletar item antigo e adicionar novo (workaround para edição)
      await axios.delete(`${API}/shopping-lists/${id}/items/${itemId}`);
      await axios.post(`${API}/shopping-lists/${id}/add-item`, {
        ingredient_name: updatedData.ingredient_name,
        quantity: updatedData.quantity,
        unit: updatedData.unit
      });

      toast.success("Item atualizado");
      setEditingItemId(null);
      loadList();
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
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

  const openAddRecipeDialog = async () => {
    setShowAddRecipeDialog(true);
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

  const handleAddRecipes = async () => {
    const selected = Object.entries(selectedRecipes)
      .filter(([_, data]) => data.selected)
      .map(([id, data]) => ({ recipe_id: id, portions: data.portions }));

    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma receita");
      return;
    }

    setAddingRecipes(true);
    try {
      // Adicionar receitas selecionadas
      for (const { recipe_id, portions } of selected) {
        await axios.post(`${API}/shopping-lists/${id}/add-recipe`, {
          recipe_id,
          portions
        });
      }

      toast.success(`${selected.length} receita(s) adicionada(s) à lista!`);
      setShowAddRecipeDialog(false);
      loadList();
    } catch (error) {
      toast.error("Erro ao adicionar receitas");
    } finally {
      setAddingRecipes(false);
    }
  };

  if (loading || !list) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <Navbar userName={userName} onLogout={onLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-pulse text-xl text-gray-600">Carregando lista...</div>
          </div>
        </div>
      </div>
    );
  }

  const pendingItems = list.items.filter((item) => !item.bought);
  const boughtItems = list.items.filter((item) => item.bought);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            data-testid="back-to-lists-button"
            variant="ghost"
            onClick={() => navigate("/listas")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3 mb-2">
            {list.is_quick_list && <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />}
            <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
              {list.name}
            </h1>
          </div>
          <p className="text-gray-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            {pendingItems.length} pendentes • {boughtItems.length} comprados
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            data-testid="add-manual-item-button"
            onClick={() => setShowAddItemDialog(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
          {boughtItems.length > 0 && (
            <Button
              data-testid="clear-bought-items-button"
              variant="outline"
              onClick={clearBoughtItems}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Limpar Comprados
            </Button>
          )}
        </div>

        {list.items.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardContent className="py-16 text-center">
              <p className="text-gray-500 mb-4">Esta lista está vazia</p>
              <Button
                onClick={() => setShowAddItemDialog(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingItems.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">Itens Pendentes</CardTitle>
                  <CardDescription>{pendingItems.length} itens para comprar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="pending-items-list">
                    {pendingItems.map((item) => (
                      editingItemId === item.id ? (
                        <EditItemRow
                          key={item.id}
                          item={item}
                          onSave={(data) => saveEditItem(item.id, data)}
                          onCancel={cancelEditItem}
                        />
                      ) : (
                        <div
                          key={item.id}
                          data-testid={`item-${item.id}`}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
                        >
                          <Checkbox
                            data-testid={`item-checkbox-${item.id}`}
                            checked={item.bought}
                            onCheckedChange={() => toggleItemBought(item.id, item.bought)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.ingredient_name}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} {item.unit}
                            </p>
                            {item.recipe_names && item.recipe_names.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                Usado em: {item.recipe_names.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              data-testid={`edit-item-${item.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditItem(item.id)}
                              className="text-orange-600 hover:bg-orange-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              data-testid={`delete-item-${item.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {boughtItems.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">Itens Comprados</CardTitle>
                  <CardDescription>{boughtItems.length} itens já comprados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="bought-items-list">
                    {boughtItems.map((item) => (
                      editingItemId === item.id ? (
                        <EditItemRow
                          key={item.id}
                          item={item}
                          onSave={(data) => saveEditItem(item.id, data)}
                          onCancel={cancelEditItem}
                        />
                      ) : (
                        <div
                          key={item.id}
                          data-testid={`bought-item-${item.id}`}
                          className="flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50"
                        >
                          <Checkbox
                            data-testid={`bought-item-checkbox-${item.id}`}
                            checked={item.bought}
                            onCheckedChange={() => toggleItemBought(item.id, item.bought)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-500 line-through">{item.ingredient_name}</p>
                            <p className="text-sm text-gray-400 line-through">
                              {item.quantity} {item.unit}
                            </p>
                            {item.recipe_names && item.recipe_names.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                Usado em: {item.recipe_names.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              data-testid={`edit-bought-item-${item.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditItem(item.id)}
                              className="text-orange-600 hover:bg-orange-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              data-testid={`delete-bought-item-${item.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent data-testid="add-item-dialog">
          <DialogHeader>
            <DialogTitle>Adicionar Item Manual</DialogTitle>
            <DialogDescription>
              Adicione um item que não vem de nenhuma receita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="item-name">Nome do Item</Label>
              <Input
                id="item-name"
                data-testid="manual-item-name-input"
                value={newItem.ingredient_name}
                onChange={(e) => setNewItem({ ...newItem, ingredient_name: e.target.value })}
                placeholder="Ex: Leite"
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-quantity">Quantidade</Label>
                <Input
                  id="item-quantity"
                  data-testid="manual-item-quantity-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="1"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="item-unit">Unidade</Label>
                <Select
                  value={newItem.unit}
                  onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                >
                  <SelectTrigger data-testid="manual-item-unit-select" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>Cancelar</Button>
            <Button
              data-testid="confirm-add-item-button"
              onClick={handleAddItem}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ShoppingListDetail;