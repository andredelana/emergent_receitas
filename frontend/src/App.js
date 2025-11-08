import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Recipes from "@/pages/Recipes";
import RecipeForm from "@/pages/RecipeForm";
import ShoppingLists from "@/pages/ShoppingLists";
import ShoppingListDetail from "@/pages/ShoppingListDetail";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configuração global do axios
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("userName");
    if (token && name) {
      setIsAuthenticated(true);
      setUserName(name);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (token, name, hasCompletedOnboarding = false) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userName", name);
    setIsAuthenticated(true);
    setUserName(name);
    
    // Se é primeiro login, executar onboarding
    if (!hasCompletedOnboarding) {
      toast.info("Preparando sua experiência...", { duration: 3000 });
      try {
        await axios.post(`${API}/onboarding/complete`);
        toast.success("Seu aplicativo está pronto! Explore as receitas criadas para você.");
      } catch (error) {
        console.error("Erro no onboarding:", error);
        // Não mostra erro ao usuário para não atrapalhar a experiência
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserName("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <div className="animate-pulse text-2xl font-medium text-orange-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/home"
            element={
              isAuthenticated ? (
                <Home userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/receitas"
            element={
              isAuthenticated ? (
                <Recipes userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/receitas/nova"
            element={
              isAuthenticated ? (
                <RecipeForm userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/receitas/editar/:id"
            element={
              isAuthenticated ? (
                <RecipeForm userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/listas"
            element={
              isAuthenticated ? (
                <ShoppingLists userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/listas/:id"
            element={
              isAuthenticated ? (
                <ShoppingListDetail userName={userName} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export { API };
export default App;