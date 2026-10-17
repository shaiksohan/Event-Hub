import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Trash2, Edit3, Save, UtensilsCrossed, Loader2, IndianRupee, Leaf, Drumstick, Check, ImagePlus, ListChecks } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/types';

const MENU_CATEGORIES = [
  'Starters',
  'Main Course',
  'Breads & Roti',
  'Rice & Biryani',
  'Curries',
  'Dals & Sambar',
  'Tiffins & Breakfast',
  'Snacks & Chaat',
  'Sweets & Desserts',
  'Drinks & Beverages',
  'Salads & Raita',
  'Papad & Pickles',
];

type EditingItem = {
  name: string;
  description: string;
  price: string;
  category: string;
  is_veg: boolean;
  image_url: string;
};

type BulkItem = EditingItem & { id: string; selected: boolean };

const EMPTY_ITEM: EditingItem = {
  name: '',
  description: '',
  price: '0',
  category: 'Main Course',
  is_veg: true,
  image_url: '',
};

function createBulkItem(): BulkItem {
  return { ...EMPTY_ITEM, id: `${Date.now()}-${Math.random()}`, selected: true };
}

export default function MenuManagerModal({
  serviceId,
  serviceName,
  onClose,
}: {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditingItem>(EMPTY_ITEM);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploadingId, setBulkUploadingId] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_menu_items')
      .select('*')
      .eq('service_id', serviceId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('The menu could not be loaded. Please close this window and try again.');
      setItems([]);
    } else {
      setLoadError('');
      setItems((data ?? []) as MenuItem[]);
    }
    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const startAdd = () => {
    setEditingId(null);
    setBulkItems([createBulkItem(), createBulkItem(), createBulkItem()]);
    setBulkError('');
    setShowForm(true);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      is_veg: item.is_veg,
      image_url: item.image_url || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_ITEM);
    setBulkItems([]);
    setBulkError('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `menu/${serviceId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('service-images').upload(path, file);
    if (!upErr) {
      const { data: pub } = supabase.storage.from('service-images').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, image_url: pub.publicUrl }));
    }
    setUploading(false);
  };

  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploadingId(id);
    const ext = file.name.split('.').pop();
    const path = `menu/${serviceId}/bulk-${Date.now()}-${id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('service-images').upload(path, file);
    if (!upErr) {
      const { data: pub } = supabase.storage.from('service-images').getPublicUrl(path);
      setBulkItems((prev) => prev.map((item) => item.id === id ? { ...item, image_url: pub.publicUrl } : item));
    }
    setBulkUploadingId(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    const payload = {
      service_id: serviceId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      is_veg: formData.is_veg,
      image_url: formData.image_url || null,
    };
    if (editingId) {
      await supabase.from('service_menu_items').update(payload).eq('id', editingId);
    }
    await fetchItems();
    setSaving(false);
    closeForm();
  };

  const handleBulkSave = async () => {
    const selectedItems = bulkItems.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      setBulkError('Select at least one food item to add.');
      return;
    }
    if (selectedItems.some((item) => !item.name.trim())) {
      setBulkError('Add a name to every selected food item, or uncheck the empty rows.');
      return;
    }

    setBulkError('');
    setSaving(true);
    const payload = selectedItems.map((item) => ({
      service_id: serviceId,
      name: item.name.trim(),
      description: item.description.trim() || null,
      price: parseFloat(item.price) || 0,
      category: item.category,
      is_veg: item.is_veg,
      image_url: item.image_url || null,
    }));
    const { error } = await supabase.from('service_menu_items').insert(payload);
    if (error) {
      setBulkError('Could not add the selected items. Please try again.');
      setSaving(false);
      return;
    }
    await fetchItems();
    setSaving(false);
    closeForm();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('service_menu_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };

  const toggleAvailable = async (item: MenuItem) => {
    await supabase.from('service_menu_items').update({ available: !item.available }).eq('id', item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !item.available } : i)));
  };

  const updateBulkItem = (id: string, changes: Partial<BulkItem>) => {
    setBulkItems((prev) => prev.map((item) => item.id === id ? { ...item, ...changes } : item));
  };

  const selectedBulkItems = bulkItems.filter((item) => item.selected);
  const bulkTotal = selectedBulkItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto bg-[#10213f]/55 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-[#0879c9]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Manage Menu</h3>
              <p className="text-xs text-gray-400">{serviceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#0879c9] animate-spin" />
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <p className="text-red-600 font-semibold">Unable to load this menu</p>
              <p className="text-sm text-gray-500 mt-2">{loadError}</p>
              <button onClick={fetchItems} className="mt-5 px-5 py-2.5 rounded-xl bg-[#0879c9] text-white font-semibold hover:bg-[#0668a8] transition-colors">Try Again</button>
            </div>
          ) : items.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <UtensilsCrossed className="w-12 h-12 text-gray-200 mx-auto" />
              <p className="text-gray-400 text-lg mt-4">No menu items yet</p>
              <p className="text-gray-400 text-sm mt-1">Add several dishes together so customers can select them when booking.</p>
              <button onClick={startAdd} className="mt-6 inline-flex items-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                <Plus className="w-5 h-5" /> Add Food Items
              </button>
            </div>
          ) : (
            <>
              {items.length > 0 && (
                <div className="space-y-5 mb-4">
                  {Object.entries(grouped).map(([category, catItems]) => (
                    <div key={category}>
                      <h4 className="text-sm font-bold text-[#0879c9] mb-2 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-4 h-4" /> {category} <span className="text-gray-400 font-normal">({catItems.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {catItems.map((item) => (
                          <div key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${item.available ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                                {item.is_veg ? <Leaf className="w-5 h-5 text-green-500" /> : <Drumstick className="w-5 h-5 text-red-400" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {item.is_veg ? <span className="w-3 h-3 rounded-sm border-2 border-green-500 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /></span> : <span className="w-3 h-3 rounded-sm border-2 border-red-500 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /></span>}
                                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                              </div>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                              <p className="text-sm font-semibold text-[#0879c9] mt-0.5 flex items-center"><IndianRupee className="w-3 h-3" />{Number(item.price).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => toggleAvailable(item)} className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${item.available ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>{item.available ? 'On' : 'Off'}</button>
                              <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#0879c9] hover:bg-[#e9f8ff] transition-colors"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showForm ? (
                <button onClick={startAdd} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#9ddff7] text-[#0879c9] font-medium hover:bg-[#e9f8ff]/50 transition-colors">
                  <Plus className="w-5 h-5" /> Add Food Items
                </button>
              ) : editingId ? (
                <SingleItemForm
                  formData={formData}
                  setFormData={setFormData}
                  uploading={uploading}
                  saving={saving}
                  onImageUpload={handleImageUpload}
                  onCancel={closeForm}
                  onSave={handleSave}
                />
              ) : (
                <div className="rounded-2xl border border-[#bdefff] bg-[#f7fbff] p-4 sm:p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-900">Add Food Items</h4>
                      <p className="text-xs text-gray-500 mt-1">Fill in several dishes, select the ones to add, and confirm once.</p>
                    </div>
                    <span className="text-xs font-semibold text-[#0879c9] bg-[#e9f8ff] px-2.5 py-1 rounded-full whitespace-nowrap">
                      {selectedBulkItems.length} selected
                    </span>
                  </div>

                  {bulkError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{bulkError}</div>}

                  <div className="hidden lg:grid grid-cols-[32px_76px_1.4fr_1fr_120px_1fr] gap-3 px-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <span /> <span>Photo</span><span>Food item</span><span>Category</span><span>Price (₹)</span><span>Type</span>
                  </div>

                  <div className="space-y-3">
                    {bulkItems.map((item, index) => (
                      <BulkItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        uploading={bulkUploadingId === item.id}
                        onChange={(changes) => updateBulkItem(item.id, changes)}
                        onImageUpload={(e) => handleBulkImageUpload(e, item.id)}
                        onRemove={() => setBulkItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                      />
                    ))}
                  </div>

                  <button onClick={() => setBulkItems((prev) => [...prev, createBulkItem()])} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#9ddff7] text-[#0879c9] text-sm font-semibold hover:bg-white transition-colors">
                    <Plus className="w-4 h-4" /> Add another item
                  </button>

                  <div className="rounded-xl bg-white border border-[#bdefff] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <ListChecks className="w-4 h-4 text-[#0879c9]" />
                      <span><strong>{selectedBulkItems.length}</strong> menu item{selectedBulkItems.length === 1 ? '' : 's'} selected</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <span className="text-sm text-gray-500">Total menu price</span>
                      <span className="text-lg font-bold text-[#0879c9] flex items-center"><IndianRupee className="w-4 h-4" />{bulkTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-white transition-colors">Cancel</button>
                    <button onClick={handleBulkSave} disabled={saving || selectedBulkItems.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white font-semibold text-sm transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Confirm & Add {selectedBulkItems.length > 0 ? `${selectedBulkItems.length} Items` : 'Selected Items'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {deleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirm(null)}>
              <div className="bg-white rounded-2xl max-w-xs w-full p-5 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-red-500" /></div>
                <h4 className="font-bold text-gray-900">Delete this item?</h4>
                <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkItemRow({
  item,
  index,
  uploading,
  onChange,
  onImageUpload,
  onRemove,
}: {
  item: BulkItem;
  index: number;
  uploading: boolean;
  onChange: (changes: Partial<BulkItem>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 p-3 transition-colors ${item.selected ? 'border-[#bdefff] bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onChange({ selected: !item.selected })} className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${item.selected ? 'bg-[#0879c9] text-white' : 'bg-white border-2 border-gray-300 text-transparent'}`} aria-label={`${item.selected ? 'Deselect' : 'Select'} item ${index + 1}`}>
          <Check className="w-3.5 h-3.5" />
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[76px_1.4fr_1fr_120px_1fr_32px] gap-3 flex-1 items-start">
          <label className="relative w-16 h-16 rounded-lg border-2 border-dashed border-[#bdefff] bg-[#f7fbff] flex items-center justify-center cursor-pointer overflow-hidden">
            {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : uploading ? <Loader2 className="w-5 h-5 text-[#0879c9] animate-spin" /> : <ImagePlus className="w-5 h-5 text-[#0879c9]" />}
            <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
          </label>
          <div>
            <label className="block lg:hidden text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Food item</label>
            <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Veg Biryani" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" />
            <input value={item.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Short description (optional)" className="w-full px-3 py-2 rounded-lg border border-gray-100 text-xs outline-none focus:border-[#00a8e8] mt-2" />
          </div>
          <div>
            <label className="block lg:hidden text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Category</label>
            <select value={item.category} onChange={(e) => onChange({ category: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[#00a8e8]">
              {MENU_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className="block lg:hidden text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Price (₹)</label>
            <div className="relative"><IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="number" min="0" step="0.01" value={item.price} onChange={(e) => onChange({ price: e.target.value })} className="w-full pl-7 pr-2 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
          </div>
          <div>
            <label className="block lg:hidden text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Type</label>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => onChange({ is_veg: true })} className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg border text-xs font-medium ${item.is_veg ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-400'}`}><Leaf className="w-3.5 h-3.5" /> Veg</button>
              <button type="button" onClick={() => onChange({ is_veg: false })} className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg border text-xs font-medium ${!item.is_veg ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400'}`}><Drumstick className="w-3.5 h-3.5" /> Non-Veg</button>
            </div>
          </div>
          <button type="button" onClick={onRemove} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Remove row"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function SingleItemForm({
  formData,
  setFormData,
  uploading,
  saving,
  onImageUpload,
  onCancel,
  onSave,
}: {
  formData: EditingItem;
  setFormData: React.Dispatch<React.SetStateAction<EditingItem>>;
  uploading: boolean;
  saving: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#dcecff] p-4 space-y-3 bg-[#f7fbff]">
      <h4 className="font-bold text-gray-900 text-sm">Edit Menu Item</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label><input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Price (₹)</label><input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[#00a8e8]">{MENU_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label><div className="flex gap-2"><button type="button" onClick={() => setFormData((prev) => ({ ...prev, is_veg: true }))} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium ${formData.is_veg ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-400'}`}><Leaf className="w-4 h-4" /> Veg</button><button type="button" onClick={() => setFormData((prev) => ({ ...prev, is_veg: false }))} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium ${!formData.is_veg ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400'}`}><Drumstick className="w-4 h-4" /> Non-Veg</button></div></div>
      </div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="font-normal text-gray-400">(Optional)</span></label><textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Brief description of the dish..." className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8] resize-none" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Item Image <span className="font-normal text-gray-400">(Optional)</span></label><label className="flex items-center gap-3 cursor-pointer">{formData.image_url ? <img src={formData.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center"><ImagePlus className="w-5 h-5 text-gray-400" /></div>}<span className="py-2.5 px-4 rounded-lg border border-gray-200 text-xs font-medium text-[#52627d]">{uploading ? 'Uploading...' : 'Upload Photo'}</span><input type="file" accept="image/*" className="hidden" onChange={onImageUpload} /></label></div>
      <div className="flex gap-2 pt-1"><button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">Cancel</button><button onClick={onSave} disabled={!formData.name.trim() || saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white font-semibold text-sm transition-colors">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Update Item</button></div>
    </div>
  );
}
