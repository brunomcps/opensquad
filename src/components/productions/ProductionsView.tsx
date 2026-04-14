import { useProductionStore } from '../../store/useProductionStore';
import { ProductionList } from './ProductionList';
import { ProductionEditor } from './ProductionEditor';

export function ProductionsView() {
  const { productions, selectedProductionId, setSelectedProductionId } = useProductionStore();
  const selected = productions.find((p) => p.id === selectedProductionId);

  if (selected) {
    return (
      <ProductionEditor
        production={selected}
        onBack={() => setSelectedProductionId(null)}
      />
    );
  }

  return <ProductionList onSelect={setSelectedProductionId} />;
}
