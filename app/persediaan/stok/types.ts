export interface InventoryStock {
  stock_id: number;

  product_id: number;
  warehouse_id: number;

  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;

  product: {
    product_name: string;
    product_code: string;
  };

  warehouse: {
    warehouse_name: string;
  };
}