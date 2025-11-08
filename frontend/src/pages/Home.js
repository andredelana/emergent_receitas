import { useState, useEffect, useRef } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Plus, ShoppingCart, ArrowRight, BookOpen, ListChecks, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { RecipeViewDialog } from "@/components/RecipeViewDialog";

function Home({ userName, onLogout }) {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);
  const [refreshingTrending, setRefreshingTrending] = useState(false);
  const [viewRecipeDialog, setViewRecipeDialog] = useState(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [favRes, sugRes, trendRes] = await Promise.all([
        axios.get(`${API}/home/favorites`),
        axios.get(`${API}/home/suggestions`),
        axios.get(`${API}/home/trending`)
      ]);
      
      setFavorites(favRes.data);
      setSuggestions(sugRes.data);
      setTrending(trendRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados da página inicial", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSuggestions = async () => {
    setRefreshingSuggestions(true);
    try {
      const response = await axios.post(`${API}/home/suggestions/refresh`);
      setSuggestions(response.data);
      toast.success("Novas sugestões geradas!");
    } catch (error) {
      toast.error("Erro ao gerar novas sugestões");
    } finally {
      setRefreshingSuggestions(false);
    }
  };

  const refreshTrending = async () => {
    setRefreshingTrending(true);
    try {
      const response = await axios.post(`${API}/home/trending/refresh`);
      setTrending(response.data);
      toast.success("Novas tendências geradas!");
    } catch (error) {
      toast.error("Erro ao gerar novas tendências");
    } finally {
      setRefreshingTrending(false);
    }
  };

  const handleCopyRecipe = async (recipeId) => {
    try {
      await axios.post(`${API}/recipes/${recipeId}/copy`);
      toast.success("Receita adicionada às suas receitas!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao adicionar receita");
    }
  };

  const handleAddToQuickList = async (recipe) => {
    try {
      const listsResponse = await axios.get(`${API}/shopping-lists`);
      const quickList = listsResponse.data.find((l) => l.is_quick_list);

      if (quickList) {
        await axios.post(`${API}/shopping-lists/${quickList.id}/add-recipe`, {
          recipe_id: recipe.id,
          portions: recipe.portions,
        });
        toast.success(`${recipe.name} adicionada à lista rápida!`);
      }
    } catch (error) {
      toast.error("Erro ao adicionar à lista");
    }
  };

  // Componente de Carrossel
  const RecipeCarousel = ({ recipes, showActions = false, actionsType = 'full' }) => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
      const container = scrollRef.current;
      if (container) {
        const scrollAmount = 400; // largura aproximada de um card + gap
        const newScrollLeft = direction === 'left' 
          ? container.scrollLeft - scrollAmount 
          : container.scrollLeft + scrollAmount;
        
        container.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth'
        });
      }
    };

    if (!recipes || recipes.length === 0) return null;

    return (
      <div className="relative group">
        {/* Botão Esquerda */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -ml-4"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>

        {/* Container de Cards */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex-shrink-0" style={{ width: '350px' }}>
              <RecipeCard recipe={recipe} showActions={showActions} actionsType={actionsType} />
            </div>
          ))}
        </div>

        {/* Botão Direita */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -mr-4"
          aria-label="Próximo"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>
    );
  };

  const RecipeCard = ({ recipe, showActions = false, actionsType = 'full' }) => (
    <Card 
      className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur overflow-hidden h-full flex flex-col cursor-pointer"
      onClick={(e) => {
        console.log('Card clicado:', recipe.name);
        setViewRecipeDialog(recipe);
      }}
    >
      {recipe.imagem_url && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={recipe.imagem_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2 mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          {recipe.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        {/* Informações principais em grid compacto */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1 text-gray-600">
            <ChefHat className="w-3 h-3" />
            <span>{recipe.portions} porções</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <ListChecks className="w-3 h-3" />
            <span>{recipe.ingredients?.length || 0} ingredientes</span>
          </div>
          {recipe.tempo_preparo > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <span>⏱️</span>
              <span>{recipe.tempo_preparo} min</span>
            </div>
          )}
          {recipe.calorias_por_porcao > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <span>🔥</span>
              <span>{recipe.calorias_por_porcao} kcal</span>
            </div>
          )}
          {recipe.custo_estimado > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <span>💰</span>
              <span>R$ {recipe.custo_estimado.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {showActions && (
          <div 
            className="flex flex-col gap-2 pt-2 border-t"
            onClick={(e) => e.stopPropagation()} // Impede que o clique nos botões abra o modal
          >
            {actionsType === 'full' && (
              <Button
                onClick={() => handleCopyRecipe(recipe.id)}
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar às minhas receitas
              </Button>
            )}
            <Button
              onClick={() => handleAddToQuickList(recipe)}
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50"
              size="sm"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Adicionar à lista rápida
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} currentPage="home" />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 mb-6 shadow-xl">
            <ChefHat className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Receitas
          </h1>
          <p className="text-xl text-gray-600 mb-12" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Suas receitas e lista de compras em um só lugar
          </p>

          {/* Infográfico */}
          <div className="bg-white/60 backdrop-blur rounded-2xl p-8 max-w-5xl mx-auto shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-2 items-center">
              {/* Passo 1 */}
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-800 text-center">Cadastrar</p>
                <p className="text-xs text-gray-500 text-center">Receitas</p>
              </div>

              {/* Seta 1 */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-orange-400" />
              </div>

              {/* Passo 2 */}
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-3 shadow-lg">
                  <ChefHat className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-800 text-center">Selecionar</p>
                <p className="text-xs text-gray-500 text-center">Porções</p>
              </div>

              {/* Seta 2 */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-amber-400" />
              </div>

              {/* Passo 3 */}
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mb-3 shadow-lg">
                  <ListChecks className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-800 text-center">Gerar</p>
                <p className="text-xs text-gray-500 text-center">Lista</p>
              </div>

              {/* Seta 3 */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-green-400" />
              </div>

              {/* Passo 4 */}
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mb-3 shadow-lg">
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-800 text-center">Comprar</p>
                <p className="text-xs text-gray-500 text-center">No mercado</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl text-gray-600">Carregando...</div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Favoritas */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Favoritas
                  </h2>
                  <p className="text-gray-600 text-sm">Receitas que você mais adiciona às listas</p>
                </div>
                {favorites.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/receitas")}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Ver todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
              {favorites.length > 0 ? (
                <RecipeCarousel recipes={favorites} showActions={true} actionsType="quicklist" />
              ) : (
                <div className="bg-white/60 backdrop-blur rounded-xl p-8 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Suas receitas favoritas aparecerão aqui quando você começar a adicioná-las às listas de compras
                  </p>
                  <Button
                    onClick={() => navigate("/receitas")}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ver Minhas Receitas
                  </Button>
                </div>
              )}
            </section>

            {/* Com Seus Ingredientes */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Com Seus Ingredientes
                    </h2>
                    <p className="text-gray-600 text-sm">Receitas criadas com ingredientes que você já usa</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={refreshSuggestions}
                    disabled={refreshingSuggestions}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    title="Gerar novas sugestões"
                  >
                    <RefreshCw className={`h-5 w-5 ${refreshingSuggestions ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {suggestions.length > 0 ? (
                <RecipeCarousel recipes={suggestions} showActions={true} />
              ) : (
                <div className="bg-white/60 backdrop-blur rounded-xl p-8 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Clique no botão <RefreshCw className="inline w-4 h-4" /> para gerar receitas personalizadas
                  </p>
                </div>
              )}
            </section>

            {/* Tendências */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Tendências
                    </h2>
                    <p className="text-gray-600 text-sm">Receitas em alta no mundo culinário</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={refreshTrending}
                    disabled={refreshingTrending}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    title="Gerar novas tendências"
                  >
                    <RefreshCw className={`h-5 w-5 ${refreshingTrending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {trending.length > 0 ? (
                <RecipeCarousel recipes={trending} showActions={true} />
              ) : (
                <div className="bg-white/60 backdrop-blur rounded-xl p-8 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Clique no botão <RefreshCw className="inline w-4 h-4" /> para descobrir tendências culinárias
                  </p>
                </div>
              )}
            </section>

            {/* Placeholder se não houver dados */}
            {favorites.length === 0 && suggestions.length === 0 && trending.length === 0 && (
              <div className="text-center py-16">
                <ChefHat className="w-20 h-20 mx-auto text-gray-300 mb-6" />
                <h3 className="text-2xl font-semibold text-gray-600 mb-3">
                  Comece adicionando suas receitas!
                </h3>
                <p className="text-gray-500 mb-6">
                  Quanto mais você usar o app, melhores serão as sugestões
                </p>
                <Button
                  onClick={() => navigate("/receitas/nova")}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  size="lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Criar Primeira Receita
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de Visualização da Receita */}
      <Dialog open={!!viewRecipeDialog} onOpenChange={() => setViewRecipeDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              {viewRecipeDialog?.name}
            </DialogTitle>
          </DialogHeader>

          {viewRecipeDialog && (
            <div className="space-y-6 py-4">
              {/* Imagem */}
              {viewRecipeDialog.imagem_url && (
                <div className="relative h-64 w-full overflow-hidden rounded-lg">
                  <img
                    src={viewRecipeDialog.imagem_url}
                    alt={viewRecipeDialog.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Porções</Label>
                  <Input value={viewRecipeDialog.portions} readOnly className="bg-gray-50" />
                </div>
                {viewRecipeDialog.link && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Link</Label>
                    <Input value={viewRecipeDialog.link} readOnly className="bg-gray-50" />
                  </div>
                )}
              </div>

              {/* Informações Nutricionais e Tempo */}
              <div className="grid grid-cols-3 gap-4">
                {viewRecipeDialog.tempo_preparo > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Tempo de Preparo</Label>
                    <Input value={`${viewRecipeDialog.tempo_preparo} minutos`} readOnly className="bg-gray-50" />
                  </div>
                )}
                {viewRecipeDialog.calorias_por_porcao > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Calorias por Porção</Label>
                    <Input value={`${viewRecipeDialog.calorias_por_porcao} kcal`} readOnly className="bg-gray-50" />
                  </div>
                )}
                {viewRecipeDialog.custo_estimado > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Custo Estimado</Label>
                    <Input value={`R$ ${viewRecipeDialog.custo_estimado.toFixed(2)}`} readOnly className="bg-gray-50" />
                  </div>
                )}
              </div>

              {/* Restrições Alimentares */}
              {viewRecipeDialog.restricoes && viewRecipeDialog.restricoes.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Restrições Alimentares</Label>
                  <div className="flex flex-wrap gap-2">
                    {viewRecipeDialog.restricoes.map((restricao) => (
                      <span
                        key={restricao}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize"
                      >
                        {restricao}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredientes */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Ingredientes ({viewRecipeDialog.ingredients?.length || 0})
                </Label>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {viewRecipeDialog.ingredients?.map((ing, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <span className="font-medium text-gray-800">{ing.name}</span>
                      <span className="text-gray-600">
                        {ing.quantity} {ing.unit}
                        {!ing.mandatory && <span className="ml-2 text-xs text-gray-400">(opcional)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modo de Preparo */}
              {viewRecipeDialog.notes && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Modo de Preparo</Label>
                  <Textarea
                    value={viewRecipeDialog.notes}
                    readOnly
                    className="bg-gray-50 min-h-[200px] whitespace-pre-wrap"
                  />
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyRecipe(viewRecipeDialog.id);
                    setViewRecipeDialog(null);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar às minhas receitas
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToQuickList(viewRecipeDialog);
                    setViewRecipeDialog(null);
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Adicionar à lista rápida
                </Button>
                <Button
                  onClick={() => setViewRecipeDialog(null)}
                  variant="outline"
                >
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Home;
