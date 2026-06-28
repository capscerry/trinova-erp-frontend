export interface Forecast {
  product_id: number;
  product_name: string;
  forecast_month: string;
  last_training_period: string;
  historical_records: number;
  forecast_next_month: number;
  generated_at: string;
}