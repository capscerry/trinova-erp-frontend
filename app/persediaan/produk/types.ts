export interface Product {
  product_id: number;

  product_name: string;
  product_code: string;

  category_id: number;
  subcategory_id: number;
  uom_id: number;

  masterProductCategory?: {
    category_id: number;
    category_name: string;
  };

  productSubcategory?: {
    subcategory_id: number;
    subcategory_name: string;
    name?: string;
  };

  masterUom?: {
    uom_id: number;
    uom_name: string;
  };
}