import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, AlertCircle, RefreshCw, Leaf, SlidersHorizontal, Layers, CheckCircle2, ShoppingBag } from 'lucide-react';
import { InventoryItem, StrainType, ItemDiscountCampaign } from '../types';

interface MemberStockShowcaseProps {
  inventory: InventoryItem[];
  currentUser: string;
  itemDiscountCampaigns?: ItemDiscountCampaign[];
  discountItemId?: string;
  itemDiscountPercent?: number;
}

// Highly polished thematic default pictures for the catalog
const DEFAULT_IMAGES: Record<string, string> = {
  flower: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=600',
  'pre-rolls': 'https://images.unsplash.com/photo-1536846862558-b80d25f0dbae?auto=format&fit=crop&q=80&w=600',
  pre_rolls: 'https://images.unsplash.com/photo-1536846862558-b80d25f0dbae?auto=format&fit=crop&q=80&w=600',
  concentrates: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?auto=format&fit=crop&q=80&w=600',
  extracts: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?auto=format&fit=crop&q=80&w=600',
  hash: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?auto=format&fit=crop&q=80&w=600',
  edibles: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=600',
  gummies: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=600',
  accessories: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600',
  vapes: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600',
  general: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600'
};

export default function MemberStockShowcase({ 
  inventory, 
  currentUser: _currentUser,
  itemDiscountCampaigns = [],
  discountItemId = '',
  itemDiscountPercent = 0
}: MemberStockShowcaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStrain, setSelectedStrain] = useState<StrainType | 'All'>('All');

  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('greenhouse_category_colors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      'Flower': '#22C55E',
      'Pre-rolls': '#F59E0B',
      'Edibles': '#EC4899',
      'Concentrates': '#8B5CF6',
      'Vapes': '#3B82F6',
      'Uncategorized': '#64748B'
    };
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('greenhouse_category_colors');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') setCategoryColors(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getCategoryColor = (cat: string) => {
    if (!cat) return '#4ADE80';
    return categoryColors[cat] || categoryColors[cat.trim()] || categoryColors[cat.toLowerCase()] || '#4ADE80';
  };

  // Calculates whether a product is on promo special
  const getItemPromoPercent = (itemId: string) => {
    if (itemDiscountCampaigns && itemDiscountCampaigns.length > 0) {
      const campaigns = itemDiscountCampaigns.filter(c => c.itemId === itemId);
      if (campaigns.length > 0) {
        return Math.max(...campaigns.map(c => c.discountPercent));
      }
    }
    if (discountItemId && discountItemId !== '' && itemId === discountItemId) {
      return itemDiscountPercent;
    }
    return 0;
  };

  // Dynamically obtain all unique categories from current inventory
  const categories = useMemo(() => {
    const list = new Set(inventory.map(item => item.category));
    return ['All', ...Array.from(list)];
  }, [inventory]);

  // Filter logic
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesStrain = selectedStrain === 'All' || item.strainType === selectedStrain;

      return matchesSearch && matchesCategory && matchesStrain;
    });
  }, [inventory, searchTerm, selectedCategory, selectedStrain]);

  // Grouped active categories to show stacked underneath each other
  const displayCategories = useMemo(() => {
    if (selectedCategory !== 'All') return [selectedCategory];
    const presentCats = new Set(filteredItems.map(item => item.category));
    return Array.from(presentCats);
  }, [selectedCategory, filteredItems]);

  // Helper to obtain product image (user-provided or beautiful fallback)
  const getItemImage = (item: InventoryItem) => {
    if (item.imageUrl && item.imageUrl.trim() !== '') {
      return item.imageUrl;
    }
    const catLower = item.category.toLowerCase();
    if (catLower.includes('flow')) return DEFAULT_IMAGES.flower;
    if (catLower.includes('roll') || catLower.includes('joint')) return DEFAULT_IMAGES['pre-rolls'];
    if (catLower.includes('concentrate') || catLower.includes('wax') || catLower.includes('shatter') || catLower.includes('resin')) return DEFAULT_IMAGES.concentrates;
    if (catLower.includes('edible') || catLower.includes('gumm') || catLower.includes('cooki')) return DEFAULT_IMAGES.edibles;
    if (catLower.includes('access') || catLower.includes('piper') || catLower.includes('bong') || catLower.includes('grind')) return DEFAULT_IMAGES.accessories;
    if (catLower.includes('vape') || catLower.includes('cartridge')) return DEFAULT_IMAGES.vapes;
    return DEFAULT_IMAGES.general;
  };

  return (
    <div className="space-y-6">
      {/* 2. Advanced Search & Live Filters Bar */}
      <div className="bg-[#0C1210]/70 border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Query strain name, type, SKU or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-[#EAB308]/50 focus:ring-1 focus:ring-[#EAB308]/25 transition font-mono"
            />
          </div>

          {/* Strain Filter */}
          <div className="flex items-center gap-2 bg-[#0A0F0D] border border-white/5 rounded-xl p-1 shrink-0">
            {(['All', 'Indica', 'Sativa', 'Hybrid'] as ('All' | StrainType)[]).map((strain) => (
              <button
                key={strain}
                type="button"
                onClick={() => setSelectedStrain(strain)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedStrain === strain
                    ? strain === 'Indica'
                      ? 'bg-purple-950/40 text-purple-400 border border-purple-500/30 font-bold'
                      : strain === 'Sativa'
                      ? 'bg-amber-950/40 text-amber-500 border border-amber-500/30 font-bold'
                      : strain === 'Hybrid'
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'bg-[#EAB308]/25 text-[#F5C71A] border border-[#EAB308]/30 font-bold'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {strain}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Category Pill Rows */}
        <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            Categories:
          </span>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer text-left sm:text-center border ${
                  selectedCategory === cat
                    ? 'bg-[#141C19] border-[#EAB308] text-[#F5C71A] font-bold shadow-md'
                    : 'bg-[#0A0F0D] border-white/5 text-zinc-400 hover:text-white hover:bg-[#141C19]/30'
                }`}
              >
                {cat === 'All' ? '📂 All Shelves' : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
                    <span>{cat}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Luxurious Neon Catalog Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#0C1210]/30 border border-white/5 rounded-2xl p-16 text-center space-y-4">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Leaf className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            We currently don't have matching herbs on display for the selected criteria. Try adjusting filters or search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayCategories.map((catName) => {
            const catItems = filteredItems.filter(item => item.category === catName);
            if (catItems.length === 0) return null;

            return (
              <div key={catName} className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                  <h2 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: getCategoryColor(catName), boxShadow: `0 0 8px ${getCategoryColor(catName)}80` }} />
                    {catName}
                  </h2>
                  <span className="text-[10px] font-mono bg-[#EAB308]/15 text-[#F5C71A] px-2 py-0.5 rounded-full border border-[#EAB308]/30 font-bold">
                    {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {catItems.map((item) => {
                    const img = getItemImage(item);
                    const isOutOfStock = item.quantity <= 0;
                    const isLimitedStock = item.quantity > 0 && item.quantity < 10;
                    const promoPercent = getItemPromoPercent(item.id);
                    const promoPrice = item.pricePerUnit * (1 - promoPercent / 100);
                    
                    return (
                      <motion.div
                        key={item.id}
                        layout="position"
                        className="bg-[#0C1210] border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-[#F5C71A]/40 shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(245,199,26,0.12)] group"
                      >
                        {/* Product Image Stage */}
                        <div className="h-32 sm:h-40 md:h-44 w-full relative overflow-hidden bg-[#0C1210]">
                          <img
                            src={img}
                            alt={item.name}
                            className="w-full h-[calc(100%+2px)] -mb-[1px] object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100 relative z-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1210] via-transparent to-transparent pointer-events-none" />
                          
                          {/* Red Banner ontop of image to show specials in gold */}
                          {promoPercent > 0 && (
                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 border-b border-rose-500/20 text-white py-1 px-1.5 sm:py-1.5 sm:px-3 flex flex-col sm:flex-row justify-between items-start sm:items-center z-10 shadow-lg gap-0.5 sm:gap-0">
                              <span className="text-[8px] sm:text-[10px] md:text-[11px] uppercase font-mono font-extrabold tracking-wider flex items-center gap-1 leading-tight truncate max-w-full">
                                <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-yellow-300 animate-pulse fill-yellow-300 shrink-0" />
                                <span className="truncate">Special ({promoPercent}%)</span>
                              </span>
                              <span className="text-[9.5px] sm:text-xs font-mono font-black text-[#F5C71A] drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.85)] tracking-tight leading-none">
                                R{promoPrice.toFixed(1)}/{item.unit}
                              </span>
                            </div>
                          )}

                          {/* Category Pill Tag */}
                          <div className={`absolute bg-[#0C1210]/95 border border-white/10 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg transition-all ${
                            promoPercent > 0 ? 'top-9 sm:top-11' : 'top-2 sm:top-3'
                          } left-2 sm:left-3 max-w-[55%] truncate`}>
                            <span className="text-[8px] sm:text-[9px] uppercase font-mono text-zinc-300 font-bold tracking-wider flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(item.category) }} />
                              <span className="truncate">{item.category}</span>
                            </span>
                          </div>

                          {/* Strain Badge */}
                          {item.strainType !== 'None' && (
                            <div className={`absolute transition-all ${
                              promoPercent > 0 ? 'top-9 sm:top-11' : 'top-2 sm:top-3'
                            } right-2 sm:right-3`}>
                              <span className={`text-[8px] sm:text-[9px] uppercase font-mono px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border font-bold block leading-none ${
                                item.strainType === 'Indica' 
                                  ? 'bg-purple-950/90 text-purple-400 border-purple-500/30'
                                  : item.strainType === 'Sativa'
                                  ? 'bg-amber-950/90 text-amber-500 border-amber-500/30'
                                  : 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {item.strainType}
                              </span>
                            </div>
                          )}

                          {/* Availability Glow Tag */}
                          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-1.5 bg-black/75 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg max-w-[90%] truncate">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOutOfStock ? 'bg-red-500' : isLimitedStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-white truncate">
                              {isOutOfStock ? 'Out of Stock' : isLimitedStock ? 'Limited' : 'In Stock'}
                            </span>
                          </div>
                        </div>

                        {/* Card Info Content */}
                        <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5 sm:gap-1">
                              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F5C71A] transition-colors line-clamp-1 sm:line-clamp-2">{item.name}</h3>
                              <span className="text-[8px] sm:text-[9px] font-mono text-zinc-600 uppercase shrink-0">SKU: {item.sku}</span>
                            </div>
                            
                            <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-sans line-clamp-2 sm:line-clamp-3">
                              {item.description}
                            </p>
                          </div>

                          {/* Species Chemistry Specs & Pricing Row */}
                          <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-white/5">
                            {/* Chemistry profile (THC / CBD) if relevant */}
                            {(item.thc > 0 || item.cbd > 0) && (
                              <div className="grid grid-cols-2 gap-1 sm:gap-2 bg-[#090D0B] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/5 font-mono text-[8px] sm:text-[9px] text-center">
                                <div className="truncate">
                                  <span className="text-zinc-500 uppercase block tracking-wider mb-0.5 truncate">THC</span>
                                  <span className="text-orange-400 font-bold">{item.thc}%</span>
                                </div>
                                <div className="border-l border-white/5 truncate">
                                  <span className="text-zinc-500 uppercase block tracking-wider mb-0.5 truncate">CBD</span>
                                  <span className="text-indigo-400 font-bold">{item.cbd}%</span>
                                </div>
                              </div>
                            )}

                            {/* Highly Polished Golden Neon Price Ring */}
                            <div 
                              className="p-2 sm:p-3 bg-gradient-to-r from-yellow-950/15 to-yellow-900/5 border rounded-lg sm:rounded-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-1 sm:gap-0"
                              style={{
                                borderColor: '#EAB30844',
                                boxShadow: 'inset 0 0 8px rgba(234, 179, 8, 0.03)'
                              }}
                            >
                              <div className="min-w-0 truncate w-full xl:w-auto">
                                <span className="text-[7.5px] sm:text-[8px] font-mono uppercase tracking-widest text-zinc-500 block truncate">
                                  {promoPercent > 0 ? 'Promo Rate' : 'Contrib Rate'}
                                </span>
                                <span className="text-[9.5px] sm:text-xs font-mono font-bold text-zinc-400 block truncate">({item.unit})</span>
                              </div>
                              <div className="text-left xl:text-right w-full xl:w-auto mt-0.5 xl:mt-0 flex xl:flex-col justify-between xl:justify-start items-baseline xl:items-end border-t border-yellow-500/10 pt-1 xl:border-0 xl:pt-0">
                                <span className="text-[7.5px] sm:text-[8px] uppercase font-mono text-yellow-500/70 block font-bold tracking-widest xl:order-2 mt-0 xl:mt-1">Value</span>
                                {promoPercent > 0 ? (
                                  <div className="flex items-baseline gap-1 xl:flex-col xl:items-end xl:gap-0 xl:order-1">
                                    <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 line-through leading-none">
                                      R{item.pricePerUnit}
                                    </span>
                                    <span className="text-base sm:text-xl font-mono font-extrabold text-[#F5C71A] tracking-tight text-glow-gold leading-none">
                                      R{promoPrice.toFixed(1)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-base sm:text-xl font-mono font-extrabold text-[#F5C71A] tracking-tight text-glow-gold xl:order-1">
                                    R{item.pricePerUnit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
