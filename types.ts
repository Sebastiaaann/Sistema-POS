export interface Movement {
  id: string;
  type: 'in' | 'out' | 'adjustment';
  productName: string;
  sku: string;
  quantity: number;
  userName: string;
  userAvatar: string;
  timestamp: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  alert?: boolean;
  color?: string; // For specialized styling
}

export interface ChartDataPoint {
  name: string;
  entradas: number;
  salidas: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: 'active' | 'inactive';
  image: string;
}