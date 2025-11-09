import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, List, LogOut, BookOpen, Menu, X, Home } from "lucide-react";

function Navbar({ userName, onLogout, currentPage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isHomePage = currentPage === "home" || location.pathname === "/home";
  const isRecipesPage = location.pathname.startsWith("/receitas");
  const isListsPage = location.pathname.startsWith("/listas");

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { 
      id: 'home',
      label: 'Início', 
      icon: Home, 
      path: '/home', 
      isActive: isHomePage,
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'recipes',
      label: 'Receitas', 
      icon: BookOpen, 
      path: '/receitas', 
      isActive: isRecipesPage,
      gradient: 'from-orange-500 to-amber-500'
    },
    { 
      id: 'lists',
      label: 'Listas', 
      icon: List, 
      path: '/listas', 
      isActive: isListsPage,
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <>
      {/* Desktop & Mobile Header */}
      <nav 
        className={`
          bg-white/80 backdrop-blur-xl border-b border-gray-200/50
          sticky top-0 z-50 transition-all duration-300
          ${isScrolled ? 'shadow-lg' : 'shadow-sm'}
        `} 
        data-testid="navbar"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" style={{ fontFamily: 'Playfair Display, serif' }}>
                Receitas
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    data-testid={`nav-${item.id}-button`}
                    variant={item.isActive ? "default" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={`
                      min-h-[44px] px-4 rounded-xl font-medium
                      transition-all duration-200 transform hover:scale-105
                      ${item.isActive ? `bg-gradient-to-r ${item.gradient} text-white shadow-md` : 'hover:bg-gray-100'}
                    `}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            {/* User Info & Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-gray-600" data-testid="user-welcome">
                Olá, <strong className="text-gray-800">{userName}</strong>
              </span>
              <Button
                data-testid="logout-button"
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 min-h-[44px] rounded-xl transition-all duration-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden
          transition-opacity duration-300
          ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Slide-out */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white z-50 md:hidden
          shadow-2xl transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Bem-vindo</p>
                <p className="font-semibold text-gray-800">{userName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="min-h-[44px] min-w-[44px] rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Menu Items */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-2xl
                      min-h-[56px] font-medium text-left
                      transition-all duration-200 transform active:scale-95
                      ${item.isActive 
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg` 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: isMobileMenuOpen ? 'slideInRight 300ms ease-out' : 'none'
                    }}
                  >
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      ${item.isActive ? 'bg-white/20' : 'bg-white'}
                    `}>
                      <Icon className={`h-5 w-5 ${item.isActive ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <span className="text-base">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Menu Footer */}
          <div className="p-6 border-t border-gray-200">
            <Button
              onClick={onLogout}
              className="w-full min-h-[52px] bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-medium shadow-lg transition-all duration-200 transform active:scale-95"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>

      {/* Animation Keyframes */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export default Navbar;