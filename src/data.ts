import { InventoryItem, Member, ActivityLog } from './types';
import indoorImg from './assets/images/indoor_cannabis_nug_1782631991518.jpg';
import outdoorImg from './assets/images/outdoor_weed_nug_1782632009908.jpg';
import preRollImg from './assets/images/pre_roll_demo_1782632142028.jpg';
import moonstickImg from './assets/images/moonstick_demo_1782632153586.jpg';
import edibleImg from './assets/images/edible_demo_1782632167022.jpg';
import concentrateImg from './assets/images/concentrate_demo_1782632178584.jpg';

export const INITIAL_INVENTORY: InventoryItem[] = [
  // --- INDOOR CATEGORY (3 Items) ---
  {
    id: 'inv-indoor-1',
    name: 'Goblin King OG (Studio Indoor Hydro)',
    category: 'Indoor',
    strainType: 'Indica',
    thc: 31.5,
    cbd: 0.2,
    quantity: 450,
    unit: 'g',
    pricePerUnit: 14.0,
    costPerGram: 8.5,
    description: 'Pristine, ultra-premium hydro flower grown in living organic soil. Frosty crystalline trichomes with dense emerald calyxes.',
    sku: 'IND-GK-01',
    imageUrl: indoorImg
  },
  {
    id: 'inv-indoor-2',
    name: 'Super Lemon Haze (Craft Indoor)',
    category: 'Indoor',
    strainType: 'Sativa',
    thc: 28.4,
    cbd: 0.5,
    quantity: 380,
    unit: 'g',
    pricePerUnit: 13.0,
    costPerGram: 8.0,
    description: 'Electrifying citrus terpene profile. Cultivated under full-spectrum LED with meticulous 14-day cold cure.',
    sku: 'IND-SLH-02',
    imageUrl: indoorImg
  },
  {
    id: 'inv-indoor-3',
    name: 'Gelato #33 (Diamond Grade Indoor)',
    category: 'Indoor',
    strainType: 'Hybrid',
    thc: 29.8,
    cbd: 0.3,
    quantity: 520,
    unit: 'g',
    pricePerUnit: 15.0,
    costPerGram: 9.0,
    description: 'Sunset Sherbet x Thin Mint GSC. Deep purple hues bursting with sweet creamy dessert aroma.',
    sku: 'IND-G33-03',
    imageUrl: indoorImg
  },

  // --- OUTDOOR CATEGORY (3 Items) ---
  {
    id: 'inv-outdoor-1',
    name: 'Sun-Kissed Gold (Organic Sun-Grown)',
    category: 'Outdoor',
    strainType: 'Sativa',
    thc: 21.0,
    cbd: 1.2,
    quantity: 1200,
    unit: 'g',
    pricePerUnit: 7.0,
    costPerGram: 3.5,
    description: 'Sun-grown organic flower resting on rustic agricultural notes. Natural loose bud structure cured under golden sunlight.',
    sku: 'OUT-SKG-01',
    imageUrl: outdoorImg
  },
  {
    id: 'inv-outdoor-2',
    name: 'Sierra Valley Pine (Full Sun Outdoor)',
    category: 'Outdoor',
    strainType: 'Indica',
    thc: 22.5,
    cbd: 0.8,
    quantity: 950,
    unit: 'g',
    pricePerUnit: 6.5,
    costPerGram: 3.0,
    description: 'Earthy forest pine and rich herbal aroma. Hardy mountain-grown indica flower offering smooth relaxation.',
    sku: 'OUT-SVP-02',
    imageUrl: outdoorImg
  },
  {
    id: 'inv-outdoor-3',
    name: 'Harlequin Sunshine (Greenhouse/Outdoor)',
    category: 'Outdoor',
    strainType: 'Hybrid',
    thc: 20.2,
    cbd: 2.5,
    quantity: 800,
    unit: 'g',
    pricePerUnit: 7.5,
    costPerGram: 4.0,
    description: 'Balanced 1:1 cannabinoid synergy. Natural sun-grown harvest with mild mango and floral notes.',
    sku: 'OUT-HAR-03',
    imageUrl: outdoorImg
  },

  // --- PRE-ROLLS CATEGORY (3 Items) ---
  {
    id: 'inv-preroll-1',
    name: 'Goblin Reserve King Cone (1.5g + Glass Tip)',
    category: 'Pre-rolls',
    strainType: 'Hybrid',
    thc: 29.0,
    cbd: 0.2,
    quantity: 150,
    unit: 'pcs',
    pricePerUnit: 15.0,
    costPerGram: 7.0,
    description: 'Artisanal pre-rolled cone rolled in unbleached organic hemp paper with a reusable quartz glass filter tip.',
    sku: 'PR-RES-01',
    imageUrl: preRollImg
  },
  {
    id: 'inv-preroll-2',
    name: 'Pure Indica Twilight Joint (1.0g Craft Cone)',
    category: 'Pre-rolls',
    strainType: 'Indica',
    thc: 26.5,
    cbd: 0.4,
    quantity: 240,
    unit: 'pcs',
    pricePerUnit: 10.0,
    costPerGram: 4.5,
    description: 'Meticulously ground pure flower (zero trim). Slow even burn designed for evening wind-down.',
    sku: 'PR-TWI-02',
    imageUrl: preRollImg
  },
  {
    id: 'inv-preroll-3',
    name: 'Daybreak Sativa Duo Pack (2 x 0.75g Joints)',
    category: 'Pre-rolls',
    strainType: 'Sativa',
    thc: 25.0,
    cbd: 0.5,
    quantity: 180,
    unit: 'pcs',
    pricePerUnit: 14.0,
    costPerGram: 6.0,
    description: 'Twin artisanal cones neatly packaged on a clean slate tray. Crisp uplifting cerebral effect.',
    sku: 'PR-DAY-03',
    imageUrl: preRollImg
  },

  // --- MOONSTICKS CATEGORY (3 Items) ---
  {
    id: 'inv-moon-1',
    name: 'Cosmic Goblin Moonstick (Hydro + Rosin + Kief)',
    category: 'Moonsticks',
    strainType: 'Hybrid',
    thc: 58.0,
    cbd: 1.0,
    quantity: 120,
    unit: 'g',
    pricePerUnit: 35.0,
    costPerGram: 18.0,
    description: 'Ultra-dense flower core dipped in golden solventless hash oil and thickly coated in blonde kief trichomes.',
    sku: 'MS-COS-01',
    imageUrl: moonstickImg
  },
  {
    id: 'inv-moon-2',
    name: 'Supernova Indica Moonrock Stick',
    category: 'Moonsticks',
    strainType: 'Indica',
    thc: 62.5,
    cbd: 0.8,
    quantity: 95,
    unit: 'g',
    pricePerUnit: 38.0,
    costPerGram: 20.0,
    description: 'Saturated in live resin amber extract and rolled in 99% THCA isolate diamonds. Heavy sedative potency.',
    sku: 'MS-SUP-02',
    imageUrl: moonstickImg
  },
  {
    id: 'inv-moon-3',
    name: 'Solar Flare Sativa Kief Stick',
    category: 'Moonsticks',
    strainType: 'Sativa',
    thc: 54.0,
    cbd: 1.5,
    quantity: 110,
    unit: 'g',
    pricePerUnit: 32.0,
    costPerGram: 16.0,
    description: 'Uplifting sativa flower infused with tangy citrus terpene sauce and dusted in golden blonde sift.',
    sku: 'MS-SOL-03',
    imageUrl: moonstickImg
  },

  // --- EDIBLES CATEGORY (3 Items) ---
  {
    id: 'inv-edible-1',
    name: 'Emerald Apple Artisanal Gummies (100mg THC)',
    category: 'Edibles',
    strainType: 'Hybrid',
    thc: 10.0,
    cbd: 0.0,
    quantity: 160,
    unit: 'pcs',
    pricePerUnit: 18.0,
    costPerGram: 8.0,
    description: 'Gourmet artisanal vegan gummy candies infused with full-spectrum live rosin. 10 precisely dosed pieces per tin.',
    sku: 'ED-EMA-01',
    imageUrl: edibleImg
  },
  {
    id: 'inv-edible-2',
    name: 'Midnight Blackberry Sleep Chews (THC + CBN)',
    category: 'Edibles',
    strainType: 'Indica',
    thc: 10.0,
    cbd: 5.0,
    quantity: 140,
    unit: 'pcs',
    pricePerUnit: 20.0,
    costPerGram: 9.0,
    description: 'Infused artisanal fruit chews pairing 10mg THC with 5mg CBN per piece for profound restful slumber.',
    sku: 'ED-MID-02',
    imageUrl: edibleImg
  },
  {
    id: 'inv-edible-3',
    name: 'Citrus Sunrise Hard Candies (150mg Sativa)',
    category: 'Edibles',
    strainType: 'Sativa',
    thc: 15.0,
    cbd: 1.0,
    quantity: 130,
    unit: 'pcs',
    pricePerUnit: 22.0,
    costPerGram: 10.0,
    description: 'Tangy gourmet citrus drops crafted for daytime social energy. Fast-acting sublingual absorption.',
    sku: 'ED-CIT-03',
    imageUrl: edibleImg
  },

  // --- CONCENTRATES CATEGORY (3 Items) ---
  {
    id: 'inv-conc-1',
    name: 'Golden Amber Live Resin Shatter (1.0g)',
    category: 'Concentrates',
    strainType: 'Hybrid',
    thc: 84.5,
    cbd: 0.5,
    quantity: 85,
    unit: 'pcs',
    pricePerUnit: 45.0,
    costPerGram: 22.0,
    description: 'Translucent amber glass extract extracted at sub-zero temperatures to preserve delicate floral volatile terpenes.',
    sku: 'CO-SHA-01',
    imageUrl: concentrateImg
  },
  {
    id: 'inv-conc-2',
    name: 'Diamond Sauce Cold-Cure Budder (1.0g)',
    category: 'Concentrates',
    strainType: 'Indica',
    thc: 88.0,
    cbd: 0.2,
    quantity: 70,
    unit: 'pcs',
    pricePerUnit: 55.0,
    costPerGram: 28.0,
    description: 'Creamy solventless hash rosin whipped into a glistening golden batter. Rich earthy pungent terpenes.',
    sku: 'CO-BUD-02',
    imageUrl: concentrateImg
  },
  {
    id: 'inv-conc-3',
    name: 'Terp Sugar Crystalline Diamonds (1.0g)',
    category: 'Concentrates',
    strainType: 'Sativa',
    thc: 86.2,
    cbd: 0.8,
    quantity: 90,
    unit: 'pcs',
    pricePerUnit: 50.0,
    costPerGram: 25.0,
    description: 'Sparkling THCA crystalline sugar diamonds drenched in sweet tropical fruit terpene fraction.',
    sku: 'CO-TER-03',
    imageUrl: concentrateImg
  }
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    name: 'Noah',
    memberNumber: 'O-0420-01',
    joinedDate: '2026-01-10',
    totalSpent: 0,
    consumedGrams: 0,
    status: 'Active',
    passwordHash: '1111', // Requested default
    lastVisit: null,
    visitsCount: 0,
    visitedDates: [],
    role: 'owner',
    isVip: true,
    notes: 'Primary Association Co-founder & Director'
  },
  {
    id: 'mem-5',
    name: 'Anthony',
    memberNumber: 'O-0420-02',
    joinedDate: '2026-06-06',
    totalSpent: 0,
    consumedGrams: 0,
    status: 'Active',
    passwordHash: '5555', // Anthony's passcode
    lastVisit: null,
    visitsCount: 0,
    visitedDates: [],
    role: 'owner',
    isVip: true,
    notes: 'Association Co-owner & Head Budtender'
  },
  {
    id: 'mem-6',
    name: 'Courtney',
    memberNumber: 'O-0420-03',
    joinedDate: '2026-06-06',
    totalSpent: 0,
    consumedGrams: 0,
    status: 'Active',
    passwordHash: '7777', // Courtney's passcode
    lastVisit: null,
    visitsCount: 0,
    visitedDates: [],
    role: 'owner',
    isVip: true,
    notes: 'Association Co-owner & Inventory Manager'
  },
  {
    id: 'mem-7',
    name: 'Sassy',
    memberNumber: 'M-0420-07',
    joinedDate: '2026-06-06',
    totalSpent: 0,
    consumedGrams: 0,
    status: 'Active',
    passwordHash: '8888', // Sassy's passcode
    lastVisit: null,
    visitsCount: 0,
    visitedDates: [],
    role: 'member',
    isVip: true,
    notes: 'Honorary VIP Member - Dues always exempt.'
  }
];

export const INITIAL_ACTIVITIES: ActivityLog[] = [];
