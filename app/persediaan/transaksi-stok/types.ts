export interface StockTransaction {
  transaction_id: number;

  product_id: number;

  warehouse_id: number;

  transaction_type: string;

  quantity: number;

  reference_no?: string;

  remarks?: string;

  created_at: string;

  product?: {
    product_id: number;
    product_name: string;
  };

  warehouse?: {
    warehouse_id: number;
    warehouse_name: string;
  };
}