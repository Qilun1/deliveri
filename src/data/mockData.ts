// Mock data for the application

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  phone: string;
  accuracyRate: number;
}

export interface DeliveryItem {
  id: string;
  name: string;
  orderedQuantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  receivedQuantity: number | null;
  status: 'pending' | 'received' | 'missing' | 'partial';
  note?: string;
}

export interface Delivery {
  id: string;
  restaurantId: string;
  restaurantName: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  deliveryDate: Date;
  status: 'pending' | 'verified' | 'discrepancy_reported';
  items: DeliveryItem[];
  discrepancyValue: number;
  createdAt: Date;
}

export interface VerificationReport {
  id: string;
  deliveryId: string;
  delivery: Delivery;
  submittedAt: Date;
  discrepancyValue: number;
  supplierStatus: 'pending_review' | 'acknowledged' | 'disputed' | 'resolved';
}

// === SUPPLIER-SIDE INTERFACES ===

export interface SupplierOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  supplierId: string;
  orderNumber: string;
  orderDate: Date;
  requestedDeliveryDate: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered';
  items: OrderItem[];
  totalValue: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  inStock: boolean;
  sku: string;
}

export interface ConnectedRestaurant {
  id: string;
  supplierId: string;
  restaurantId: string;
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  connectedSince: Date;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate: Date | null;
}

// Sample Suppliers
export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Kespro',
    contactEmail: 'orders@kespro.fi',
    phone: '+358 10 123 4567',
    accuracyRate: 94,
  },
  {
    id: 'sup-2',
    name: 'Metro Tukku',
    contactEmail: 'tilaukset@metro.fi',
    phone: '+358 10 234 5678',
    accuracyRate: 91,
  },
  {
    id: 'sup-3',
    name: 'Heinon Tukku',
    contactEmail: 'info@heinontukku.fi',
    phone: '+358 10 345 6789',
    accuracyRate: 97,
  },
  {
    id: 'sup-4',
    name: 'Valio',
    contactEmail: 'asiakaspalvelu@valio.fi',
    phone: '+358 10 456 7890',
    accuracyRate: 99,
  },
  {
    id: 'sup-5',
    name: 'HKScan',
    contactEmail: 'orders@hkscan.fi',
    phone: '+358 10 567 8901',
    accuracyRate: 95,
  },
];

// Sample Products (simple list for restaurants)
export const MOCK_PRODUCTS = [
  { name: 'Naudan jauheliha 20%', unit: 'kg', pricePerUnit: 8.99 },
  { name: 'Broilerin rintafilee', unit: 'kg', pricePerUnit: 13.50 },
  { name: 'Tuore lohi', unit: 'kg', pricePerUnit: 18.00 },
  { name: 'Perunat', unit: 'kg', pricePerUnit: 1.20 },
  { name: 'Sipuli', unit: 'kg', pricePerUnit: 2.50 },
  { name: 'Porkkana', unit: 'kg', pricePerUnit: 1.80 },
  { name: 'Maito 3%', unit: 'l', pricePerUnit: 1.15 },
  { name: 'Voi', unit: 'kg', pricePerUnit: 12.00 },
  { name: 'Kananmunat', unit: 'kpl', pricePerUnit: 0.35 },
  { name: 'Ruisleipä', unit: 'kpl', pricePerUnit: 3.50 },
];

// === SUPPLIER PRODUCT CATALOG ===
export const MOCK_SUPPLIER_PRODUCTS: SupplierProduct[] = [
  { id: 'prod-1', supplierId: 'sup-1', name: 'Naudan jauheliha 20%', category: 'Meat', unit: 'kg', pricePerUnit: 8.99, inStock: true, sku: 'MEAT-001' },
  { id: 'prod-2', supplierId: 'sup-1', name: 'Broilerin rintafilee', category: 'Meat', unit: 'kg', pricePerUnit: 13.50, inStock: true, sku: 'MEAT-002' },
  { id: 'prod-3', supplierId: 'sup-1', name: 'Tuore lohi', category: 'Fish', unit: 'kg', pricePerUnit: 18.00, inStock: true, sku: 'FISH-001' },
  { id: 'prod-4', supplierId: 'sup-1', name: 'Perunat', category: 'Vegetables', unit: 'kg', pricePerUnit: 1.20, inStock: true, sku: 'VEG-001' },
  { id: 'prod-5', supplierId: 'sup-1', name: 'Sipuli', category: 'Vegetables', unit: 'kg', pricePerUnit: 2.50, inStock: true, sku: 'VEG-002' },
  { id: 'prod-6', supplierId: 'sup-1', name: 'Porkkana', category: 'Vegetables', unit: 'kg', pricePerUnit: 1.80, inStock: true, sku: 'VEG-003' },
  { id: 'prod-7', supplierId: 'sup-1', name: 'Maito 3%', category: 'Dairy', unit: 'l', pricePerUnit: 1.15, inStock: true, sku: 'DAIRY-001' },
  { id: 'prod-8', supplierId: 'sup-1', name: 'Voi', category: 'Dairy', unit: 'kg', pricePerUnit: 12.00, inStock: false, sku: 'DAIRY-002' },
  { id: 'prod-9', supplierId: 'sup-1', name: 'Kananmunat', category: 'Dairy', unit: 'kpl', pricePerUnit: 0.35, inStock: true, sku: 'DAIRY-003' },
  { id: 'prod-10', supplierId: 'sup-1', name: 'Ruisleipä', category: 'Bakery', unit: 'kpl', pricePerUnit: 3.50, inStock: true, sku: 'BAKE-001' },
  { id: 'prod-11', supplierId: 'sup-1', name: 'Tomaatti', category: 'Vegetables', unit: 'kg', pricePerUnit: 3.20, inStock: true, sku: 'VEG-004' },
  { id: 'prod-12', supplierId: 'sup-1', name: 'Kurkku', category: 'Vegetables', unit: 'kg', pricePerUnit: 2.80, inStock: true, sku: 'VEG-005' },
];

// === CONNECTED RESTAURANTS ===
export const MOCK_CONNECTED_RESTAURANTS: ConnectedRestaurant[] = [
  {
    id: 'conn-1',
    supplierId: 'sup-1',
    restaurantId: '1',
    name: 'Ravintola Savotta',
    contactEmail: 'orders@savotta.fi',
    phone: '+358 9 742 5550',
    address: 'Aleksanterinkatu 22, 00170 Helsinki',
    connectedSince: new Date('2024-03-15'),
    totalOrders: 47,
    totalRevenue: 12450.00,
    lastOrderDate: new Date('2025-01-16'),
  },
  {
    id: 'conn-2',
    supplierId: 'sup-1',
    restaurantId: '2',
    name: 'Ravintola Juuri',
    contactEmail: 'info@juuri.fi',
    phone: '+358 9 635 732',
    address: 'Korkeavuorenkatu 27, 00130 Helsinki',
    connectedSince: new Date('2024-06-01'),
    totalOrders: 32,
    totalRevenue: 8920.50,
    lastOrderDate: new Date('2025-01-14'),
  },
  {
    id: 'conn-3',
    supplierId: 'sup-1',
    restaurantId: '3',
    name: 'Ravintola Olo',
    contactEmail: 'reservations@olo.fi',
    phone: '+358 10 320 6250',
    address: 'Pohjoisesplanadi 5, 00170 Helsinki',
    connectedSince: new Date('2024-01-10'),
    totalOrders: 89,
    totalRevenue: 34200.00,
    lastOrderDate: new Date('2025-01-15'),
  },
  {
    id: 'conn-4',
    supplierId: 'sup-1',
    restaurantId: '4',
    name: 'Ravintola Ask',
    contactEmail: 'hello@restaurantask.com',
    phone: '+358 44 236 9800',
    address: 'Vironkatu 8, 00170 Helsinki',
    connectedSince: new Date('2024-08-20'),
    totalOrders: 18,
    totalRevenue: 5640.00,
    lastOrderDate: new Date('2025-01-10'),
  },
];

// === SUPPLIER ORDERS (Incoming orders from restaurants) ===
export const MOCK_SUPPLIER_ORDERS: SupplierOrder[] = [
  {
    id: 'ord-1',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0089',
    orderDate: new Date('2025-01-23T08:30:00'),
    requestedDeliveryDate: new Date('2025-01-24'),
    status: 'pending',
    totalValue: 247.90,
    items: [
      { id: 'oi-1', productId: 'prod-1', name: 'Naudan jauheliha 20%', quantity: 15, unit: 'kg', pricePerUnit: 8.99, totalPrice: 134.85 },
      { id: 'oi-2', productId: 'prod-2', name: 'Broilerin rintafilee', quantity: 8, unit: 'kg', pricePerUnit: 13.50, totalPrice: 108.00 },
      { id: 'oi-3', productId: 'prod-5', name: 'Sipuli', quantity: 2, unit: 'kg', pricePerUnit: 2.50, totalPrice: 5.00 },
    ],
    notes: 'Please deliver before 10am',
  },
  {
    id: 'ord-2',
    restaurantId: '3',
    restaurantName: 'Ravintola Olo',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0090',
    orderDate: new Date('2025-01-23T09:15:00'),
    requestedDeliveryDate: new Date('2025-01-24'),
    status: 'pending',
    totalValue: 412.50,
    items: [
      { id: 'oi-4', productId: 'prod-3', name: 'Tuore lohi', quantity: 12, unit: 'kg', pricePerUnit: 18.00, totalPrice: 216.00 },
      { id: 'oi-5', productId: 'prod-1', name: 'Naudan jauheliha 20%', quantity: 10, unit: 'kg', pricePerUnit: 8.99, totalPrice: 89.90 },
      { id: 'oi-6', productId: 'prod-7', name: 'Maito 3%', quantity: 50, unit: 'l', pricePerUnit: 1.15, totalPrice: 57.50 },
      { id: 'oi-7', productId: 'prod-9', name: 'Kananmunat', quantity: 140, unit: 'kpl', pricePerUnit: 0.35, totalPrice: 49.00 },
    ],
  },
  {
    id: 'ord-3',
    restaurantId: '2',
    restaurantName: 'Ravintola Juuri',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0088',
    orderDate: new Date('2025-01-22T14:00:00'),
    requestedDeliveryDate: new Date('2025-01-23'),
    status: 'confirmed',
    totalValue: 156.40,
    items: [
      { id: 'oi-8', productId: 'prod-4', name: 'Perunat', quantity: 30, unit: 'kg', pricePerUnit: 1.20, totalPrice: 36.00 },
      { id: 'oi-9', productId: 'prod-6', name: 'Porkkana', quantity: 20, unit: 'kg', pricePerUnit: 1.80, totalPrice: 36.00 },
      { id: 'oi-10', productId: 'prod-11', name: 'Tomaatti', quantity: 15, unit: 'kg', pricePerUnit: 3.20, totalPrice: 48.00 },
      { id: 'oi-11', productId: 'prod-12', name: 'Kurkku', quantity: 13, unit: 'kg', pricePerUnit: 2.80, totalPrice: 36.40 },
    ],
  },
  {
    id: 'ord-4',
    restaurantId: '4',
    restaurantName: 'Ravintola Ask',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0085',
    orderDate: new Date('2025-01-21T11:30:00'),
    requestedDeliveryDate: new Date('2025-01-22'),
    status: 'shipped',
    totalValue: 324.00,
    items: [
      { id: 'oi-12', productId: 'prod-3', name: 'Tuore lohi', quantity: 8, unit: 'kg', pricePerUnit: 18.00, totalPrice: 144.00 },
      { id: 'oi-13', productId: 'prod-2', name: 'Broilerin rintafilee', quantity: 10, unit: 'kg', pricePerUnit: 13.50, totalPrice: 135.00 },
      { id: 'oi-14', productId: 'prod-8', name: 'Voi', quantity: 3, unit: 'kg', pricePerUnit: 12.00, totalPrice: 36.00 },
      { id: 'oi-15', productId: 'prod-9', name: 'Kananmunat', quantity: 25, unit: 'kpl', pricePerUnit: 0.35, totalPrice: 8.75 },
    ],
  },
  {
    id: 'ord-5',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0082',
    orderDate: new Date('2025-01-20T09:00:00'),
    requestedDeliveryDate: new Date('2025-01-21'),
    status: 'delivered',
    totalValue: 189.50,
    items: [
      { id: 'oi-16', productId: 'prod-1', name: 'Naudan jauheliha 20%', quantity: 12, unit: 'kg', pricePerUnit: 8.99, totalPrice: 107.88 },
      { id: 'oi-17', productId: 'prod-7', name: 'Maito 3%', quantity: 40, unit: 'l', pricePerUnit: 1.15, totalPrice: 46.00 },
      { id: 'oi-18', productId: 'prod-10', name: 'Ruisleipä', quantity: 10, unit: 'kpl', pricePerUnit: 3.50, totalPrice: 35.00 },
    ],
  },
  {
    id: 'ord-6',
    restaurantId: '3',
    restaurantName: 'Ravintola Olo',
    supplierId: 'sup-1',
    orderNumber: 'ORD-2025-0080',
    orderDate: new Date('2025-01-19T16:00:00'),
    requestedDeliveryDate: new Date('2025-01-20'),
    status: 'delivered',
    totalValue: 567.00,
    items: [
      { id: 'oi-19', productId: 'prod-3', name: 'Tuore lohi', quantity: 20, unit: 'kg', pricePerUnit: 18.00, totalPrice: 360.00 },
      { id: 'oi-20', productId: 'prod-2', name: 'Broilerin rintafilee', quantity: 12, unit: 'kg', pricePerUnit: 13.50, totalPrice: 162.00 },
      { id: 'oi-21', productId: 'prod-5', name: 'Sipuli', quantity: 18, unit: 'kg', pricePerUnit: 2.50, totalPrice: 45.00 },
    ],
  },
];

// Sample Deliveries
export const MOCK_DELIVERIES: Delivery[] = [
  {
    id: 'del-1',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-1',
    supplierName: 'Kespro',
    orderNumber: 'INV-2024-4521',
    deliveryDate: new Date('2025-01-16'),
    status: 'pending',
    discrepancyValue: 0,
    items: [
      { id: 'item-1', name: 'Naudan jauheliha 20%', orderedQuantity: 10, unit: 'kg', pricePerUnit: 8.99, totalPrice: 89.90, receivedQuantity: null, status: 'pending' },
      { id: 'item-2', name: 'Broilerin rintafilee', orderedQuantity: 5, unit: 'kg', pricePerUnit: 13.50, totalPrice: 67.50, receivedQuantity: null, status: 'pending' },
      { id: 'item-3', name: 'Tuore lohi', orderedQuantity: 3, unit: 'kg', pricePerUnit: 18.00, totalPrice: 54.00, receivedQuantity: null, status: 'pending' },
      { id: 'item-4', name: 'Perunat', orderedQuantity: 20, unit: 'kg', pricePerUnit: 1.20, totalPrice: 24.00, receivedQuantity: null, status: 'pending' },
      { id: 'item-5', name: 'Sipuli', orderedQuantity: 5, unit: 'kg', pricePerUnit: 2.50, totalPrice: 12.50, receivedQuantity: null, status: 'pending' },
    ],
    createdAt: new Date('2025-01-16'),
  },
  {
    id: 'del-2',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-2',
    supplierName: 'Metro Tukku',
    orderNumber: 'INV-2024-8834',
    deliveryDate: new Date('2025-01-15'),
    status: 'pending',
    discrepancyValue: 0,
    items: [
      { id: 'item-6', name: 'Maito 3%', orderedQuantity: 50, unit: 'l', pricePerUnit: 1.15, totalPrice: 57.50, receivedQuantity: null, status: 'pending' },
      { id: 'item-7', name: 'Voi', orderedQuantity: 5, unit: 'kg', pricePerUnit: 12.00, totalPrice: 60.00, receivedQuantity: null, status: 'pending' },
      { id: 'item-8', name: 'Kananmunat', orderedQuantity: 120, unit: 'kpl', pricePerUnit: 0.35, totalPrice: 42.00, receivedQuantity: null, status: 'pending' },
    ],
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'del-3',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-1',
    supplierName: 'Kespro',
    orderNumber: 'INV-2024-4520',
    deliveryDate: new Date('2025-01-14'),
    status: 'verified',
    discrepancyValue: 54.00,
    items: [
      { id: 'item-9', name: 'Naudan jauheliha 20%', orderedQuantity: 10, unit: 'kg', pricePerUnit: 8.99, totalPrice: 89.90, receivedQuantity: 10, status: 'received' },
      { id: 'item-10', name: 'Broilerin rintafilee', orderedQuantity: 5, unit: 'kg', pricePerUnit: 13.50, totalPrice: 67.50, receivedQuantity: 5, status: 'received' },
      { id: 'item-11', name: 'Tuore lohi', orderedQuantity: 3, unit: 'kg', pricePerUnit: 18.00, totalPrice: 54.00, receivedQuantity: 0, status: 'missing', note: 'Box was not in delivery' },
      { id: 'item-12', name: 'Perunat', orderedQuantity: 20, unit: 'kg', pricePerUnit: 1.20, totalPrice: 24.00, receivedQuantity: 20, status: 'received' },
    ],
    createdAt: new Date('2025-01-14'),
  },
  {
    id: 'del-4',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-3',
    supplierName: 'Heinon Tukku',
    orderNumber: 'INV-2024-7721',
    deliveryDate: new Date('2025-01-13'),
    status: 'verified',
    discrepancyValue: 0,
    items: [
      { id: 'item-13', name: 'Porkkana', orderedQuantity: 15, unit: 'kg', pricePerUnit: 1.80, totalPrice: 27.00, receivedQuantity: 15, status: 'received' },
      { id: 'item-14', name: 'Sipuli', orderedQuantity: 10, unit: 'kg', pricePerUnit: 2.50, totalPrice: 25.00, receivedQuantity: 10, status: 'received' },
    ],
    createdAt: new Date('2025-01-13'),
  },
  {
    id: 'del-5',
    restaurantId: '1',
    restaurantName: 'Ravintola Savotta',
    supplierId: 'sup-4',
    supplierName: 'Valio',
    orderNumber: 'INV-2024-9001',
    deliveryDate: new Date('2025-01-12'),
    status: 'discrepancy_reported',
    discrepancyValue: 36.00,
    items: [
      { id: 'item-15', name: 'Maito 3%', orderedQuantity: 100, unit: 'l', pricePerUnit: 1.15, totalPrice: 115.00, receivedQuantity: 100, status: 'received' },
      { id: 'item-16', name: 'Voi', orderedQuantity: 8, unit: 'kg', pricePerUnit: 12.00, totalPrice: 96.00, receivedQuantity: 5, status: 'partial', note: 'Only 5kg delivered, 3kg missing' },
    ],
    createdAt: new Date('2025-01-12'),
  },
];

// Verification Reports for Supplier view
export const MOCK_REPORTS: VerificationReport[] = [
  {
    id: 'rep-1',
    deliveryId: 'del-3',
    delivery: MOCK_DELIVERIES[2],
    submittedAt: new Date('2025-01-14T14:30:00'),
    discrepancyValue: 54.00,
    supplierStatus: 'pending_review',
  },
  {
    id: 'rep-2',
    deliveryId: 'del-5',
    delivery: MOCK_DELIVERIES[4],
    submittedAt: new Date('2025-01-12T16:45:00'),
    discrepancyValue: 36.00,
    supplierStatus: 'acknowledged',
  },
];

// === HELPER FUNCTIONS ===

export function getSupplierById(id: string): Supplier | undefined {
  return MOCK_SUPPLIERS.find((s) => s.id === id);
}

export function getDeliveriesForRestaurant(restaurantId: string): Delivery[] {
  return MOCK_DELIVERIES.filter((d) => d.restaurantId === restaurantId);
}

export function getPendingDeliveries(restaurantId: string): Delivery[] {
  return MOCK_DELIVERIES.filter((d) => d.restaurantId === restaurantId && d.status === 'pending');
}

export function getReportsForSupplier(supplierId: string): VerificationReport[] {
  return MOCK_REPORTS.filter((r) => r.delivery.supplierId === supplierId);
}

// === SUPPLIER-SIDE HELPER FUNCTIONS ===

export function getOrdersForSupplier(supplierId: string): SupplierOrder[] {
  return MOCK_SUPPLIER_ORDERS.filter((o) => o.supplierId === supplierId);
}

export function getPendingOrdersForSupplier(supplierId: string): SupplierOrder[] {
  return MOCK_SUPPLIER_ORDERS.filter((o) => o.supplierId === supplierId && o.status === 'pending');
}

export function getActiveDeliveriesForSupplier(supplierId: string): SupplierOrder[] {
  return MOCK_SUPPLIER_ORDERS.filter(
    (o) => o.supplierId === supplierId && (o.status === 'confirmed' || o.status === 'preparing' || o.status === 'shipped')
  );
}

export function getDeliveredOrdersForSupplier(supplierId: string): SupplierOrder[] {
  return MOCK_SUPPLIER_ORDERS.filter((o) => o.supplierId === supplierId && o.status === 'delivered');
}

export function getProductsForSupplier(supplierId: string): SupplierProduct[] {
  return MOCK_SUPPLIER_PRODUCTS.filter((p) => p.supplierId === supplierId);
}

export function getRestaurantsForSupplier(supplierId: string): ConnectedRestaurant[] {
  return MOCK_CONNECTED_RESTAURANTS.filter((r) => r.supplierId === supplierId);
}

export function getIssuesForSupplier(supplierId: string): VerificationReport[] {
  return MOCK_REPORTS.filter((r) => r.delivery.supplierId === supplierId);
}

export function getOpenIssuesForSupplier(supplierId: string): VerificationReport[] {
  return MOCK_REPORTS.filter(
    (r) => r.delivery.supplierId === supplierId && (r.supplierStatus === 'pending_review' || r.supplierStatus === 'disputed')
  );
}

// Get supplier stats
export function getSupplierStats(supplierId: string) {
  const orders = getOrdersForSupplier(supplierId);
  const pendingOrders = getPendingOrdersForSupplier(supplierId);
  const activeDeliveries = getActiveDeliveriesForSupplier(supplierId);
  const openIssues = getOpenIssuesForSupplier(supplierId);
  const restaurants = getRestaurantsForSupplier(supplierId);

  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalValue, 0);

  return {
    totalOrders: orders.length,
    pendingOrders: pendingOrders.length,
    deliveriesInTransit: activeDeliveries.length,
    openIssues: openIssues.length,
    connectedRestaurants: restaurants.length,
    totalRevenue,
  };
}
