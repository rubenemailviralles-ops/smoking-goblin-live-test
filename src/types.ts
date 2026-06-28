export type StrainType = 'Indica' | 'Sativa' | 'Hybrid' | 'None';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  strainType: StrainType;
  thc: number; // percentage or mg
  cbd: number; // percentage or mg
  quantity: number; // in grams or package units
  unit: 'g' | 'pcs';
  pricePerUnit: number; // contributions/selling price
  costPerGram: number; // cost per gram or per unit for stock acquisition
  description: string;
  sku: string;
  imageUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  idCardNumber?: string;
  isVip?: boolean;
  memberNumber: string;
  joinedDate: string;
  totalSpent: number;
  consumedGrams: number;
  status: 'Active' | 'Suspended' | 'Expired';
  passwordHash: string; // stored plain (changeable)
  lastVisit: string | null;
  lastCheckIn?: string; // ISO string to track 3 hours frequency
  lastMembershipPaidDate?: string; // YYYY-MM-DD string tracking when last membership was paid
  membershipExpiresDate?: string; // YYYY-MM-DD string tracking when membership expires
  visitsCount: number;
  visitedDates?: string[];
  notes?: string;
  role?: 'owner' | 'trusted_budtender' | 'budtender' | 'member';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'InventoryAdjust' | 'Dispensed' | 'MemberCheckIn' | 'MemberUpdate' | 'Security';
  message: string;
  user: string; // Who triggered the action
  details?: string;
  undoPayload?: {
    type: 'inventory_count' | 'delete_stock' | 'delete_member';
    previousItemState?: InventoryItem;
    previousMemberState?: Member;
    itemId?: string;
    previousQuantity?: number;
    undone?: boolean;
    undoneBy?: string;
    undoneTimestamp?: string;
  };
}

export interface AppState {
  inventory: InventoryItem[];
  members: Member[];
  activities: ActivityLog[];
}

export interface VisitDiscountRule {
  id: string;
  threshold: number;
  discountPercent: number;
}

export interface ItemDiscountCampaign {
  id: string;
  itemId: string;
  discountPercent: number;
}

