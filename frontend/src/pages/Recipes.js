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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Plus, Edit, Trash2, ShoppingCart, LogOut, List, Search, Filter, X, Clock, DollarSign, Flame, Leaf, Wheat, Milk } from "lucide-react";
import Navbar from "@/components/Navbar";

// Ícones de restrições
const RESTRICTION_ICONS = {
  "vegetariano": { icon: Leaf, label: "Vegetariano", color: "text-green-600" },
  "vegano": { icon: Leaf, label: "Vegano", color: "text-green-700" },
  "sem gluten": { icon: Wheat, label: "Sem Glúten", color: "text-amber-600" },
  "sem lactose": { icon: Milk, label: "Sem Lactose", color: "text-blue-600" }
};

const RESTRICTIONS = ["vegetariano", "vegano", "sem gluten", "sem lactose"];

function Recipes({ userName, onLogout }) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addToListDialog, setAddToListDialog] = useState(null);
  const [portions, setPortions] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Estados de filtros
  const [filters, setFilters] = useState({
    keyword: "",
    ingredient: "",
    portions: "",
    tempoPreparo: "",
    calorias: "todos", // todos, baixo, medio, alto
    custo: "todos", // todos, baixo, medio, alto
    restricoes: []
  });

  // Estado de ordenação
  const [sortBy, setSortBy] = useState("recentes"); // recentes, antigas, nome-az, nome-za, tempo, custo, mais-usadas

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [recipes, filters, sortBy]);

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

  const applyFiltersAndSort = () => {
    let filtered = [...recipes];

    // Filtro por palavra-chave
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(keyword) || 
        r.notes?.toLowerCase().includes(keyword)
      );
    }

    // Filtro por ingrediente
    if (filters.ingredient) {
      const ingredient = filters.ingredient.toLowerCase();
      filtered = filtered.filter(r =>
        r.ingredients.some(ing => ing.name.toLowerCase().includes(ingredient))
      );
    }

    // Filtro por porções
    if (filters.portions) {
      filtered = filtered.filter(r => r.portions === parseInt(filters.portions));
    }

    // Filtro por tempo de preparo
    if (filters.tempoPreparo) {
      filtered = filtered.filter(r => 
        r.tempo_preparo && r.tempo_preparo <= parseInt(filters.tempoPreparo)
      );
    }

    // Filtro por calorias
    if (filters.calorias !== "todos") {
      filtered = filtered.filter(r => {
        if (!r.calorias_por_porcao) return false;
        if (filters.calorias === "baixo") return r.calorias_por_porcao < 250;
        if (filters.calorias === "medio") return r.calorias_por_porcao >= 250 && r.calorias_por_porcao <= 600;
        if (filters.calorias === "alto") return r.calorias_por_porcao > 600;
        return true;
      });
    }

    // Filtro por custo
    if (filters.custo !== "todos") {
      filtered = filtered.filter(r => {
        if (!r.custo_estimado) return false;
        if (filters.custo === "baixo") return r.custo_estimado < 20;
        if (filters.custo === "medio") return r.custo_estimado >= 20 && r.custo_estimado <= 50;
        if (filters.custo === "alto") return r.custo_estimado > 50;
        return true;
      });
    }

    // Filtro por restrições
    if (filters.restricoes.length > 0) {
      filtered = filtered.filter(r =>
        filters.restricoes.every(rest => r.restricoes?.includes(rest))
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recentes":
          return new Date(b.created_at) - new Date(a.created_at);
        case "antigas":
          return new Date(a.created_at) - new Date(b.created_at);
        case "nome-az":
          return a.name.localeCompare(b.name);
        case "nome-za":
          return b.name.localeCompare(a.name);
        case "tempo":
          return (a.tempo_preparo || 999) - (b.tempo_preparo || 999);
        case "custo":
          return (a.custo_estimado || 999) - (b.custo_estimado || 999);
        case "mais-usadas":
          // TODO: implementar contagem de uso
          return 0;
        default:
          return 0;
      }
    });

    setFilteredRecipes(filtered);
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

  const toggleRestriction = (restriction) => {
    setFilters(prev => ({
      ...prev,
      restricoes: prev.restricoes.includes(restriction)
        ? prev.restricoes.filter(r => r !== restriction)
        : [...prev.restricoes, restriction]
    }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: "",
      ingredient: "",
      portions: "",
      tempoPreparo: "",
      calorias: "todos",
      custo: "todos",
      restricoes: []
    });
  };

  const hasActiveFilters = () => {
    return filters.keyword || filters.ingredient || filters.portions || 
           filters.tempoPreparo || filters.calorias !== "todos" || 
           filters.custo !== "todos" || filters.restricoes.length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Minhas Receitas
            </h1>
            <p className="text-gray-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receita' : 'receitas'}
              {hasActiveFilters() && ' (filtradas)'}
            </p>
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

        {/* Barra de Filtros e Ordenação */}
        <Card className="mb-6 border-0 bg-white/80 backdrop-blur shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters() && (
                  <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                    {Object.values(filters).flat().filter(Boolean).length}
                  </span>
                )}
              </Button>

              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Label className="text-sm text-gray-600">Ordenar por:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais Recentes</SelectItem>
                    <SelectItem value="antigas">Mais Antigas</SelectItem>
                    <SelectItem value="nome-az">Nome (A-Z)</SelectItem>
                    <SelectItem value="nome-za">Nome (Z-A)</SelectItem>
                    <SelectItem value="tempo">Menor Tempo</SelectItem>
                    <SelectItem value="custo">Menor Custo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Painel de Filtros Expandível */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Busca por palavra-chave */}
                  <div>
                    <Label className="text-sm mb-2">Palavra-chave</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nome ou observações..."
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Busca por ingrediente */}
                  <div>
                    <Label className="text-sm mb-2">Ingrediente</Label>
                    <Input
                      placeholder="Ex: tomate, farinha..."
                      value={filters.ingredient}
                      onChange={(e) => setFilters({ ...filters, ingredient: e.target.value })}
                    />
                  </div>

                  {/* Porções */}
                  <div>
                    <Label className="text-sm mb-2">Porções</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Número de porções"
                      value={filters.portions}
                      onChange={(e) => setFilters({ ...filters, portions: e.target.value })}
                    />
                  </div>

                  {/* Tempo de preparo */}
                  <div>
                    <Label className="text-sm mb-2">Tempo máximo (min)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 30"
                      value={filters.tempoPreparo}
                      onChange={(e) => setFilters({ ...filters, tempoPreparo: e.target.value })}
                    />
                  </div>

                  {/* Calorias */}
                  <div>
                    <Label className="text-sm mb-2">Calorias por porção</Label>
                    <Select value={filters.calorias} onValueChange={(val) => setFilters({ ...filters, calorias: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        <SelectItem value="baixo">Baixo (&lt; 250 kcal)</SelectItem>
                        <SelectItem value="medio">Médio (250-600 kcal)</SelectItem>
                        <SelectItem value="alto">Alto (&gt; 600 kcal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custo */}
                  <div>
                    <Label className="text-sm mb-2">Custo estimado</Label>
                    <Select value={filters.custo} onValueChange={(val) => setFilters({ ...filters, custo: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="baixo">Baixo (&lt; R$ 20)</SelectItem>
                        <SelectItem value="medio">Médio (R$ 20-50)</SelectItem>
                        <SelectItem value="alto">Alto (&gt; R$ 50)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Restrições Alimentares */}
                <div>
                  <Label className="text-sm mb-3 block">Restrições Alimentares</Label>
                  <div className="flex flex-wrap gap-3">
                    {RESTRICTIONS.map((restriction) => {
                      const IconData = RESTRICTION_ICONS[restriction];
                      const Icon = IconData?.icon;
                      return (
                        <div key={restriction} className="flex items-center space-x-2">
                          <Checkbox
                            id={`restriction-${restriction}`}
                            checked={filters.restricoes.includes(restriction)}
                            onCheckedChange={() => toggleRestriction(restriction)}
                          />
                          <label
                            htmlFor={`restriction-${restriction}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer"
                          >
                            {Icon && <Icon className={`h-4 w-4 ${IconData.color}`} />}
                            {IconData?.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl text-gray-600">Carregando receitas...</div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              {hasActiveFilters() ? "Nenhuma receita encontrada" : "Nenhuma receita ainda"}
            </h2>
            <p className="text-gray-500 mb-6">
              {hasActiveFilters() 
                ? "Tente ajustar os filtros para encontrar receitas" 
                : "Comece criando sua primeira receita!"}
            </p>
            {!hasActiveFilters() && (
              <Button
                onClick={() => navigate("/receitas/nova")}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Receita
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="recipes-grid">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur overflow-hidden cursor-pointer" 
                data-testid={`recipe-card-${recipe.id}`}
                onClick={() => navigate(`/receitas/editar/${recipe.id}`)}
              >
                {recipe.imagem_url && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={recipe.imagem_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl flex-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      {recipe.name}
                    </CardTitle>
                    {recipe.restricoes && recipe.restricoes.length > 0 && (
                      <div className="flex gap-1 ml-2">
                        {recipe.restricoes.slice(0, 3).map((rest) => {
                          const IconData = RESTRICTION_ICONS[rest];
                          const Icon = IconData?.icon;
                          return Icon ? (
                            <Icon key={rest} className={`h-5 w-5 ${IconData.color}`} title={IconData.label} />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <CardDescription className="space-y-1">
                    <div>{recipe.portions} porções • {recipe.ingredients.length} ingredientes</div>
                    {recipe.tempo_preparo > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {recipe.tempo_preparo} min
                      </div>
                    )}
                    {recipe.calorias_por_porcao > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Flame className="h-3 w-3" />
                        {recipe.calorias_por_porcao} kcal/porção
                      </div>
                    )}
                    {recipe.custo_estimado > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <DollarSign className="h-3 w-3" />
                        R$ {recipe.custo_estimado.toFixed(2)}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                <CardFooter className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
