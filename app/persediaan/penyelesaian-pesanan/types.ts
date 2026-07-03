export interface OrderFulfillment {
  movement_id: number;

  product_id: number;

  product_name?: string;

  movement_type: string;

  quantity: number;

  reference_number: string;

  notes: string;

  movement_date: string;

  source_warehouse_id: number;

  warehouse_name?: string;
}