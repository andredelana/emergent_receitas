import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, List, LogOut, BookOpen } from "lucide-react";

function Navbar({ userName, onLogout, currentPage }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = currentPage === "home" || location.pathname === "/home";
  const isRecipesPage = location.pathname.startsWith("/receitas");
  const isListsPage = location.pathname.startsWith("/listas");

  return (
    <nav className="bg-white/70 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50" data-testid="navbar">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" style={{ fontFamily: 'Playfair Display, serif' }}>
              Receitas
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              data-testid="nav-home-button"
              variant={isHomePage ? "default" : "ghost"}
              onClick={() => navigate("/home")}
              className={isHomePage ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : ""}
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Início
            </Button>
            <Button
              data-testid="nav-recipes-button"
              variant={isRecipesPage ? "default" : "ghost"}
              onClick={() => navigate("/receitas")}
              className={isRecipesPage ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" : ""}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Receitas
            </Button>
            <Button
              data-testid="nav-lists-button"
              variant={isListsPage ? "default" : "ghost"}
              onClick={() => navigate("/listas")}
              className={isListsPage ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" : ""}
            >
              <List className="mr-2 h-4 w-4" />
              Listas
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600" data-testid="user-welcome">
            Olá, <strong>{userName}</strong>
          </span>
          <Button
            data-testid="logout-button"
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;