import { useState, useEffect, useRef } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Plus, ShoppingCart, ArrowRight, BookOpen, ListChecks, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";

function Home({ userName, onLogout }) {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);
  const [refreshingTrending, setRefreshingTrending] = useState(false);

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
  const RecipeCarousel = ({ recipes, showActions = false }) => {
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
              <RecipeCard recipe={recipe} showActions={showActions} />
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

  const RecipeCard = ({ recipe, showActions = false }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur overflow-hidden">
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
        <CardTitle className="text-lg line-clamp-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          {recipe.name}
        </CardTitle>
        <CardDescription>
          {recipe.portions} porções • {recipe.ingredients?.length || 0} ingredientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recipe.notes && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{recipe.notes}</p>
        )}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700">Ingredientes principais:</p>
          {recipe.ingredients?.slice(0, 3).map((ing, idx) => (
            <p key={idx} className="text-xs text-gray-600">
              • {ing.name}
            </p>
          ))}
          {recipe.ingredients?.length > 3 && (
            <p className="text-xs text-gray-400 italic">+ {recipe.ingredients.length - 3} mais</p>
          )}
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => handleCopyRecipe(recipe.id)}
            variant="outline"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar às minhas receitas
          </Button>
          <Button
            onClick={() => handleAddToQuickList(recipe)}
            variant="outline"
            className="w-full border-green-300 text-green-700 hover:bg-green-50"
            size="sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Adicionar à lista rápida
          </Button>
        </CardFooter>
      )}
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
          <div className="bg-white/60 backdrop-blur rounded-2xl p-8 max-w-4xl mx-auto shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Como funciona</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                  <BookOpen className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Cadastrar Receitas</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Adicione suas receitas favoritas
                </p>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <ChefHat className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Selecionar Porções</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Escolha quantas pessoas vão comer
                </p>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <ListChecks className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Gerar Lista</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Lista agregada automaticamente
                </p>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Comprar</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Vá ao mercado com sua lista
                </p>
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
            {favorites.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Suas Favoritas
                    </h2>
                    <p className="text-gray-600 text-sm">Receitas que você mais adiciona às listas</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/receitas")}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Ver todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <RecipeCarousel recipes={favorites} showActions={false} />
              </section>
            )}

            {/* Sugestões */}
            {suggestions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Com Seus Ingredientes Favoritos
                    </h2>
                    <p className="text-gray-600 text-sm">Receitas criadas especialmente para você com IA • Atualizado diariamente</p>
                  </div>
                </div>
                <RecipeCarousel recipes={suggestions} showActions={true} />
              </section>
            )}

            {/* Tendências */}
            {trending.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Em Tendência
                    </h2>
                    <p className="text-gray-600 text-sm">Receitas populares entre todos os usuários</p>
                  </div>
                </div>
                <RecipeCarousel recipes={trending} showActions={true} />
              </section>
            )}

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
    </div>
  );
}

export default Home;
