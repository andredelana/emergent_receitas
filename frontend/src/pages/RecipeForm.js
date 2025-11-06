import { useState, useEffect } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Clipboard, Loader2, ChefHat, Edit, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";

const UNITS = [
  "g", "kg", "mg",
  "ml", "l", "cl",
  "colher (sopa)", "colher (chá)", "xícara",
  "unidade", "pitada", "a gosto"
];

// Componente para edição inline de ingrediente
function EditIngredientRow({ ingredient, onSave, onCancel }) {
  const [editData, setEditData] = useState({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    mandatory: ingredient.mandatory
  });

  return (
    <div className="bg-amber-50 p-3 rounded-md border-2 border-amber-300">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <Label className="text-xs">Nome</Label>
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Qtd</Label>
          <Input
            type="number"
            step="0.01"
            value={editData.quantity}
            onChange={(e) => setEditData({ ...editData, quantity: parseFloat(e.target.value) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Unidade</Label>
          <Select value={editData.unit} onValueChange={(value) => setEditData({ ...editData, unit: value })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 flex items-center justify-center">
          <div className="flex items-center space-x-1">
            <Checkbox
              checked={editData.mandatory}
              onCheckedChange={(checked) => setEditData({ ...editData, mandatory: checked })}
            />
            <Label className="text-xs">Obrig.</Label>
          </div>
        </div>
        <div className="col-span-1 flex gap-1">
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(editData)}
            className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecipeForm({ userName, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [clipboardText, setClipboardText] = useState("");
  const [importedRecipe, setImportedRecipe] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    portions: 1,
    link: "",
    notes: "",
    ingredients: [],
    tempo_preparo: 0,
    calorias_por_porcao: 0,
    custo_estimado: 0,
    restricoes: [],
    imagem_url: ""
  });
  
  const [imagePreview, setImagePreview] = useState("");

  const [currentIngredient, setCurrentIngredient] = useState({
    name: "",
    quantity: "",
    unit: "g",
    mandatory: true
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null);

  useEffect(() => {
    if (isEditing) {
      loadRecipe();
    }
  }, [id]);

  useEffect(() => {
    if (formData.imagem_url) {
      setImagePreview(formData.imagem_url);
    }
  }, [formData.imagem_url]);

  const loadRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      const recipe = response.data.find((r) => r.id === id);
      if (recipe) {
        setFormData(recipe);
      } else {
        toast.error("Receita não encontrada");
        navigate("/receitas");
      }
    } catch (error) {
      toast.error("Erro ao carregar receita");
      navigate("/receitas");
    }
  };

  const handleIngredientNameChange = async (value) => {
    setCurrentIngredient({ ...currentIngredient, name: value });

    if (value.length >= 2) {
      try {
        const response = await axios.get(`${API}/ingredients/suggestions?query=${value}`);
        setSuggestions(response.data);
        setShowSuggestions(true);
      } catch (error) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setCurrentIngredient({ ...currentIngredient, name: suggestion });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const addIngredient = () => {
    if (!currentIngredient.name || !currentIngredient.quantity || !currentIngredient.unit) {
      toast.error("Preencha todos os campos do ingrediente");
      return;
    }

    const newIngredient = {
      ...currentIngredient,
      quantity: parseFloat(currentIngredient.quantity)
    };

    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, newIngredient]
    });

    setCurrentIngredient({
      name: "",
      quantity: "",
      unit: "g",
      mandatory: true
    });
    setShowSuggestions(false);
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const startEditIngredient = (index) => {
    setEditingIngredientIndex(index);
  };

  const saveEditIngredient = (index, updatedIngredient) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = updatedIngredient;
    setFormData({ ...formData, ingredients: newIngredients });
    setEditingIngredientIndex(null);
  };

  const cancelEditIngredient = () => {
    setEditingIngredientIndex(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verifica tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5MB.");
        return;
      }

      // Converte para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setFormData({ ...formData, imagem_url: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setFormData({ ...formData, imagem_url: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.ingredients.length === 0) {
      toast.error("Adicione pelo menos um ingrediente");
      return;
    }

    // Verifica se precisa estimar valores
    const needsEstimation = 
      formData.tempo_preparo === 0 || 
      formData.calorias_por_porcao === 0 || 
      formData.custo_estimado === 0 || 
      formData.restricoes.length === 0;

    setLoading(true);
    
    if (needsEstimation) {
      toast.info("Estimando valores com IA...", { duration: 3000 });
    }

    try {
      if (isEditing) {
        await axios.put(`${API}/recipes/${id}`, formData);
        toast.success("Receita atualizada com sucesso!");
      } else {
        await axios.post(`${API}/recipes`, formData);
        toast.success("Receita criada com sucesso!");
      }
      
      if (needsEstimation) {
        toast.success("Valores estimados com sucesso!");
      }
      
      navigate("/receitas");
    } catch (error) {
      toast.error("Erro ao salvar receita");
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromClipboard = async () => {
    setShowImportDialog(true);
    try {
      const text = await navigator.clipboard.readText();
      setClipboardText(text);
    } catch (error) {
      toast.error("Não foi possível acessar a área de transferência");
    }
  };

  const processImport = async () => {
    if (!clipboardText.trim()) {
      toast.error("Cole um texto para importar");
      return;
    }

    setImportLoading(true);
    try {
      const response = await axios.post(`${API}/recipes/import-from-clipboard`, {
        clipboard_text: clipboardText
      });
      setImportedRecipe(response.data);
      toast.success("Receita importada! Revise e salve.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao importar receita");
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImport = () => {
    if (importedRecipe) {
      setFormData({
        name: importedRecipe.name,
        portions: importedRecipe.portions,
        link: importedRecipe.link || "",
        notes: importedRecipe.notes || "",
        ingredients: importedRecipe.ingredients
      });
      setShowImportDialog(false);
      setImportedRecipe(null);
      setClipboardText("");
      toast.success("Receita carregada! Revise e salve.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <Navbar userName={userName} onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            data-testid="back-button"
            variant="ghost"
            onClick={() => navigate("/receitas")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {isEditing ? "Editar Receita" : "Nova Receita"}
          </h1>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Informações da Receita</CardTitle>
              {!isEditing && (
                <Button
                  data-testid="import-clipboard-button"
                  variant="outline"
                  onClick={handleImportFromClipboard}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Importar do Clipboard
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Receita *</Label>
                  <Input
                    id="name"
                    data-testid="recipe-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Bolo de Chocolate"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portions">Porções *</Label>
                  <Input
                    id="portions"
                    data-testid="recipe-portions-input"
                    type="number"
                    min="1"
                    value={formData.portions}
                    onChange={(e) => setFormData({ ...formData, portions: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Link (opcional)</Label>
                <Input
                  id="link"
                  data-testid="recipe-link-input"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  data-testid="recipe-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Modo de preparo, dicas, etc."
                  rows={4}
                />
              </div>

              {/* Campos adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo de Preparo (min)</Label>
                  <Input
                    id="tempo"
                    type="number"
                    min="0"
                    value={formData.tempo_preparo}
                    onChange={(e) => setFormData({ ...formData, tempo_preparo: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorias">Calorias/Porção (kcal)</Label>
                  <Input
                    id="calorias"
                    type="number"
                    min="0"
                    value={formData.calorias_por_porcao}
                    onChange={(e) => setFormData({ ...formData, calorias_por_porcao: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 350"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custo">Custo Estimado (R$)</Label>
                  <Input
                    id="custo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.custo_estimado}
                    onChange={(e) => setFormData({ ...formData, custo_estimado: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 25.00"
                  />
                </div>
              </div>

              {/* Restrições Alimentares */}
              <div className="space-y-2">
                <Label>Restrições Alimentares</Label>
                <div className="flex flex-wrap gap-4">
                  {["vegetariano", "vegano", "sem gluten", "sem lactose"].map((restricao) => (
                    <div key={restricao} className="flex items-center space-x-2">
                      <Checkbox
                        id={`restricao-${restricao}`}
                        checked={formData.restricoes.includes(restricao)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, restricoes: [...formData.restricoes, restricao] });
                          } else {
                            setFormData({ ...formData, restricoes: formData.restricoes.filter(r => r !== restricao) });
                          }
                        }}
                      />
                      <Label htmlFor={`restricao-${restricao}`} className="text-sm font-normal capitalize cursor-pointer">
                        {restricao}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Ingredientes</h3>

                <div className="bg-amber-50 p-4 rounded-lg space-y-3 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5 relative">
                      <Label htmlFor="ing-name">Nome do Ingrediente</Label>
                      <Input
                        id="ing-name"
                        data-testid="ingredient-name-input"
                        value={currentIngredient.name}
                        onChange={(e) => handleIngredientNameChange(e.target.value)}
                        placeholder="Ex: Farinha de trigo"
                        autoComplete="off"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto" data-testid="ingredient-suggestions">
                          {suggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              data-testid={`suggestion-${idx}`}
                              className="px-3 py-2 hover:bg-amber-50 cursor-pointer text-sm"
                              onClick={() => selectSuggestion(sug)}
                            >
                              {sug}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="ing-qty">Quantidade</Label>
                      <Input
                        id="ing-qty"
                        data-testid="ingredient-quantity-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentIngredient.quantity}
                        onChange={(e) => setCurrentIngredient({ ...currentIngredient, quantity: e.target.value })}
                        placeholder="500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="ing-unit">Unidade</Label>
                      <Select
                        value={currentIngredient.unit}
                        onValueChange={(value) => setCurrentIngredient({ ...currentIngredient, unit: value })}
                      >
                        <SelectTrigger data-testid="ingredient-unit-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mandatory"
                          data-testid="ingredient-mandatory-checkbox"
                          checked={currentIngredient.mandatory}
                          onCheckedChange={(checked) => setCurrentIngredient({ ...currentIngredient, mandatory: checked })}
                        />
                        <Label htmlFor="mandatory" className="text-sm">Obrigatório</Label>
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        data-testid="add-ingredient-button"
                        onClick={addIngredient}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.ingredients.length > 0 && (
                  <div className="space-y-2" data-testid="ingredients-list">
                    <p className="text-sm font-semibold text-gray-700">Ingredientes adicionados:</p>
                    {formData.ingredients.map((ing, idx) => (
                      editingIngredientIndex === idx ? (
                        <EditIngredientRow
                          key={idx}
                          ingredient={ing}
                          onSave={(updated) => saveEditIngredient(idx, updated)}
                          onCancel={cancelEditIngredient}
                        />
                      ) : (
                        <div
                          key={idx}
                          data-testid={`ingredient-item-${idx}`}
                          className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-200"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{ing.name}</span>
                            <span className="text-gray-600 ml-2">
                              {ing.quantity} {ing.unit}
                            </span>
                            {!ing.mandatory && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Opcional</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              data-testid={`edit-ingredient-${idx}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditIngredient(idx)}
                              className="text-orange-600 hover:bg-orange-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              data-testid={`remove-ingredient-${idx}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIngredient(idx)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/receitas")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="save-recipe-button"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Receita"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="import-dialog">
          <DialogHeader>
            <DialogTitle>Importar Receita do Clipboard</DialogTitle>
            <DialogDescription>
              Cole o texto da receita abaixo e nossa IA irá extraí-la automaticamente.
            </DialogDescription>
          </DialogHeader>

          {!importedRecipe ? (
            <div className="space-y-4">
              <Textarea
                data-testid="clipboard-textarea"
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                placeholder="Cole aqui o texto da receita..."
                rows={12}
                className="font-mono text-sm"
              />
              <Button
                data-testid="process-import-button"
                onClick={processImport}
                disabled={importLoading || !clipboardText.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Importar"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4" data-testid="imported-recipe-preview">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">{importedRecipe.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Porções:</strong> {importedRecipe.portions}
                </p>
                {importedRecipe.notes && (
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Observações:</strong> {importedRecipe.notes}
                  </p>
                )}
                <div>
                  <strong className="text-sm">Ingredientes:</strong>
                  <ul className="mt-2 space-y-1">
                    {importedRecipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-sm">
                        • {ing.name} - {ing.quantity} {ing.unit}
                        {!ing.mandatory && <span className="text-gray-500 ml-1">(Opcional)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportedRecipe(null);
                    setClipboardText("");
                  }}
                  className="flex-1"
                >
                  Tentar Novamente
                </Button>
                <Button
                  data-testid="confirm-import-button"
                  onClick={confirmImport}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Usar esta Receita
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecipeForm;