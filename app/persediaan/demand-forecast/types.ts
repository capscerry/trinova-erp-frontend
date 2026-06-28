export interface DemandForecast {
  product_id: number;
  product_name: string;
  total_usage: number;
  forecast_next_month: number;
  current_stock: number;
  recommendation: string;
}