import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState from "../../../components/DataState";
import { fetchProducts, setSearchText } from "../../../redux/productsSlice";
import { getAvailableStock } from "../../../api/inventoryApi";
import { formatMoney } from "../../../utils/orderCalculations";
import { fileUrl } from "../../../api/client";
import "./ProductCatalog.css";

// vendor's product catalog (issues #7, #9)
// real GET /api/v1/products, plus each product's stock from the separate
// inventory collection. Search is applied server-side.
function ProductCatalog() {
  const dispatch = useDispatch();

  const { items: products, searchText, isLoading, error } = useSelector(
    (state) => state.products,
  );

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchProducts(searchText ? { search: searchText } : {}));
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch, searchText]);

  return (
    <DashboardLayout heading="Product Catalog">
      <input
        type="text"
        placeholder="Search products..."
        value={searchText}
        onChange={(event) => dispatch(setSearchText(event.target.value))}
        className="catalog-search"
      />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={products.length === 0}
        emptyMessage="No products found."
        onRetry={() => dispatch(fetchProducts())}
      >
        <div className="catalog-grid">
          {products.map((product) => {
            const available = getAvailableStock(product.inventory);

            return (
              <div key={product._id} className="catalog-card">
                <div className="catalog-card-image">
                  {product.imageUrl ? (
                    <img src={fileUrl(product.imageUrl)} alt={product.name} />
                  ) : (
                    <span aria-hidden="true">📦</span>
                  )}
                </div>

                <h3>{product.name}</h3>
                <p className="catalog-card-sku">{product.sku}</p>

                {product.description && (
                  <p className="catalog-card-description">
                    {product.description}
                  </p>
                )}

                <p className="catalog-card-price">
                  {formatMoney(product.unitPrice)}
                </p>

                {/* stock lives in the Inventory collection, not on the product */}
                <p className="catalog-card-stock">
                  {product.inventory
                    ? `In stock: ${available}`
                    : "Stock not tracked"}
                </p>
              </div>
            );
          })}
        </div>
      </DataState>
    </DashboardLayout>
  );
}

export default ProductCatalog;
