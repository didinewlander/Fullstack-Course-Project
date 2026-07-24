import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { setSearchText } from "../../../redux/productsSlice";
import "./ProductCatalog.css";

// this is the vendor's product catalog page (issue #7, vendor part)
// vendors can see all available products and search them by name
// the product list lives in Redux (see redux/productsSlice.js)
// it's fake/mock data for now, real data comes later once the backend
// (issue #10) and the API layer (issue #9) are ready
function ProductCatalog() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const products = useSelector((state) => state.products.items);
  const searchText = useSelector((state) => state.products.searchText);

  // only keep the products whose name matches what the vendor typed
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchText.toLowerCase())
  );

  function handleSearchChange(event) {
    dispatch(setSearchText(event.target.value));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <div>
          <h1>Vendor Dashboard</h1>
          <p>Welcome, {user?.name}!</p>
        </div>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <h2>Product Catalog</h2>

      <input
        type="text"
        placeholder="Search products..."
        value={searchText}
        onChange={handleSearchChange}
        className="catalog-search"
      />

      {filteredProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="catalog-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="catalog-card">
              <div className="catalog-card-image">{product.image}</div>
              <h3>{product.name}</h3>
              <p className="catalog-card-price">
                ${product.price.toFixed(2)}
              </p>
              <p className="catalog-card-stock">In stock: {product.stock}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductCatalog;
