import { useState, useMemo } from 'react';
import { UtensilsCrossed, Leaf, Drumstick, IndianRupee, Check, ListChecks, X, ShoppingBasket } from 'lucide-react';
import type { MenuItem } from '@/lib/types';

export type SelectedItem = {
  menu_item_id: string;
  name: string;
  price: number;
  is_veg: boolean;
  quantity: number;
};

export default function MenuSelection({
  items,
  loading,
  selected,
  onChange,
}: {
  items: MenuItem[];
  loading: boolean;
  selected: Record<string, SelectedItem>;
  onChange: (next: Record<string, SelectedItem>) => void;
}) {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category)));
    return ['All', ...cats];
  }, [items]);

  const filtered = activeCategory === 'All' ? items : items.filter((i) => i.category === activeCategory);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});
  }, [filtered]);

  const isSelected = (itemId: string) => (selected[itemId]?.quantity ?? 0) > 0;

  const toggleItem = (item: MenuItem) => {
    if (isSelected(item.id)) {
      const next = { ...selected };
      delete next[item.id];
      onChange(next);
    } else {
      onChange({
        ...selected,
        [item.id]: {
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price),
          is_veg: item.is_veg,
          quantity: 1,
        },
      });
    }
  };

  const setQty = (item: MenuItem, qty: number) => {
    if (qty <= 0) {
      const next = { ...selected };
      delete next[item.id];
      onChange(next);
    } else {
      onChange({
        ...selected,
        [item.id]: {
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price),
          is_veg: item.is_veg,
          quantity: qty,
        },
      });
    }
  };

  const totalItems = Object.values(selected).reduce((sum, s) => sum + s.quantity, 0);
  const menuTotal = Object.values(selected).reduce((sum, s) => sum + Number(s.price ?? 0) * Number(s.quantity ?? 0), 0);
  const selectedCount = Object.keys(selected).length;

  const allItemSelected = items.length > 0 && items.every((item) => isSelected(item.id));

  const selectAll = () => {
    const next: Record<string, SelectedItem> = {};
    items.forEach((item) => {
      next[item.id] = {
        menu_item_id: item.id,
        name: item.name,
        price: Number(item.price),
        is_veg: item.is_veg,
        quantity: 1,
      };
    });
    onChange(next);
  };

  const clearAll = () => {
    onChange({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-[#e9f8ff]/30 border border-[#dcecff] p-4 text-center">
        <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-400 mt-2">The provider hasn't added a menu yet.</p>
        <p className="text-xs text-gray-400 mt-1">You can still book this catering service and discuss menu details directly.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#dcecff] p-4 space-y-3">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9]">
          <UtensilsCrossed className="w-4 h-4" /> Select Menu Items
        </h4>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button
            onClick={allItemSelected ? clearAll : selectAll}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
              allItemSelected
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-[#0879c9] text-white hover:bg-[#0668a8]'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" /> {allItemSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Live counter badge */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879c9] bg-[#e9f8ff] px-3 py-1 rounded-full">
            <ShoppingBasket className="w-3.5 h-3.5" />
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected · ₹{menuTotal.toFixed(2)}
          </span>
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-[#0879c9] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items grid — tap to select multiple */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            {activeCategory === 'All' && (
              <p className="text-xs font-semibold text-gray-400 mb-1.5">{category}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {catItems.map((item) => {
                const sel = isSelected(item.id);
                const qty = selected[item.id]?.quantity ?? 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`relative flex items-center gap-3 rounded-xl border-2 p-2.5 cursor-pointer transition-all duration-200 ${
                      sel
                        ? 'border-[#00a8e8] bg-[#e9f8ff]/50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-[#bdefff] hover:bg-[#f7fbff]'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        sel ? 'bg-[#0879c9] scale-100' : 'bg-white border-2 border-gray-200 scale-90'
                      }`}
                    >
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Item image */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className={`w-14 h-14 rounded-lg object-cover flex-shrink-0 transition-all ${
                          sel ? 'ring-2 ring-[#00a8e8]' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                        {item.is_veg ? <Leaf className="w-5 h-5 text-green-500" /> : <Drumstick className="w-5 h-5 text-red-400" />}
                      </div>
                    )}

                    {/* Item details */}
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-center gap-1.5">
                        {item.is_veg ? (
                          <span className="w-3 h-3 rounded-sm border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="w-1 h-1 rounded-full bg-green-500" />
                          </span>
                        ) : (
                          <span className="w-3 h-3 rounded-sm border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="w-1 h-1 rounded-full bg-red-500" />
                          </span>
                        )}
                        <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                      )}
                      <p className="text-sm font-semibold text-[#0879c9] flex items-center mt-0.5">
                        <IndianRupee className="w-3 h-3" />{Number(item.price).toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity stepper — appears when selected, stops propagation */}
                    {sel && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 flex-shrink-0 absolute bottom-2 right-2"
                      >
                        <button
                          onClick={() => setQty(item, qty - 1)}
                          className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:border-[#00a8e8] transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-600">−</span>
                        </button>
                        <span className="font-bold text-gray-900 text-xs w-5 text-center">{qty}</span>
                        <button
                          onClick={() => setQty(item, qty + 1)}
                          className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:border-[#00a8e8] transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-600">+</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected summary with totals */}
      {totalItems > 0 && (
        <div className="rounded-lg bg-gradient-to-r from-[#e9f8ff] to-[#f0fbff] p-3 space-y-2 border border-[#bdefff]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0879c9] uppercase tracking-wide">Your Menu</span>
            <span className="text-xs font-medium text-gray-500">{selectedCount} item{selectedCount > 1 ? 's' : ''} · {totalItems} serving{totalItems > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Object.values(selected).filter((s) => s.quantity > 0).map((s) => (
              <div key={s.menu_item_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-[#0879c9]" />
                  {s.name} × {s.quantity}
                </span>
                <span className="font-medium text-gray-900">₹{(Number(s.price ?? 0) * Number(s.quantity ?? 0)).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#bdefff]">
            <span className="text-sm font-bold text-gray-900">Menu Total</span>
            <span className="text-lg font-bold text-[#0879c9] flex items-center">
              <IndianRupee className="w-4 h-4" />{menuTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
