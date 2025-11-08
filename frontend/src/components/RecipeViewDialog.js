import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export function RecipeViewDialog({ recipe, open, onClose, onCopyRecipe, onAddToList }) {
  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            {recipe.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Imagem */}
          {recipe.imagem_url && (
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
              <img
                src={recipe.imagem_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Porções</Label>
              <Input value={recipe.portions} readOnly className="bg-gray-50" />
            </div>
            {recipe.link && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Link</Label>
                <Input value={recipe.link} readOnly className="bg-gray-50" />
              </div>
            )}
          </div>

          {/* Informações Nutricionais e Tempo */}
          <div className="grid grid-cols-3 gap-4">
            {recipe.tempo_preparo > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Tempo de Preparo</Label>
                <Input value={`${recipe.tempo_preparo} minutos`} readOnly className="bg-gray-50" />
              </div>
            )}
            {recipe.calorias_por_porcao > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Calorias por Porção</Label>
                <Input value={`${recipe.calorias_por_porcao} kcal`} readOnly className="bg-gray-50" />
              </div>
            )}
            {recipe.custo_estimado > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Custo Estimado</Label>
                <Input value={`R$ ${recipe.custo_estimado.toFixed(2)}`} readOnly className="bg-gray-50" />
              </div>
            )}
          </div>

          {/* Restrições Alimentares */}
          {recipe.restricoes && recipe.restricoes.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Restrições Alimentares</Label>
              <div className="flex flex-wrap gap-2">
                {recipe.restricoes.map((restricao) => (
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
              Ingredientes ({recipe.ingredients?.length || 0})
            </Label>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              {recipe.ingredients?.map((ing, index) => (
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
          {recipe.notes && (
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Modo de Preparo</Label>
              <Textarea
                value={recipe.notes}
                readOnly
                className="bg-gray-50 min-h-[200px] whitespace-pre-wrap"
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            {onAddToList && (
              <Button
                onClick={() => {
                  onAddToList(recipe);
                  onClose();
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                🛒 Adicionar à lista rápida
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
