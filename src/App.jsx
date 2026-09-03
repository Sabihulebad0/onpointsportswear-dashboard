import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import ProductForm from "./pages/ProductForm.jsx";
import ProductView from "./pages/ProductView.jsx";
import Categories from "./pages/Categories.jsx";
import CategoryView from "./pages/CategoryView.jsx";
import CategoryEdit from "./pages/CategoryEdit.jsx";
import Orders from "./pages/Orders.jsx";
import OrderView from "./pages/OrderView.jsx";
import Cart from "./pages/Cart.jsx";
import Coupons from "./pages/Coupons.jsx";
import Users from "./pages/Users.jsx";
import UserEdit from "./pages/UserEdit.jsx";
import Search from "./pages/Search.jsx";
import Notifications from "./pages/Notifications.jsx";
import Attributes from "./pages/Attributes.jsx";

function Protected({ children }) {
  const { loading, token, canAccessAdmin } = useAuth();
  if (loading) return <div className="center">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (!canAccessAdmin) {
    return (
      <div className="center">
        <p>This panel is for staff, delivery, and admin accounts only.</p>
      </div>
    );
  }
  return children;
}

function StaffOnly({ children }) {
  const { isDelivery } = useAuth();
  if (isDelivery) return <Navigate to="/orders" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route
          path="/"
          element={
            <StaffOnly>
              <Dashboard />
            </StaffOnly>
          }
        />
        <Route
          path="/search"
          element={
            <StaffOnly>
              <Search />
            </StaffOnly>
          }
        />
        <Route
          path="/products"
          element={
            <StaffOnly>
              <Products />
            </StaffOnly>
          }
        />
        <Route
          path="/products/new"
          element={
            <StaffOnly>
              <ProductForm />
            </StaffOnly>
          }
        />
        <Route
          path="/products/:id"
          element={
            <StaffOnly>
              <ProductView />
            </StaffOnly>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <StaffOnly>
              <ProductForm />
            </StaffOnly>
          }
        />
        <Route
          path="/categories"
          element={
            <StaffOnly>
              <Categories />
            </StaffOnly>
          }
        />
        <Route
          path="/categories/:id/edit"
          element={
            <StaffOnly>
              <CategoryEdit />
            </StaffOnly>
          }
        />
        <Route
          path="/categories/:id"
          element={
            <StaffOnly>
              <CategoryView />
            </StaffOnly>
          }
        />
        <Route
          path="/attributes"
          element={
            <StaffOnly>
              <Attributes />
            </StaffOnly>
          }
        />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderView />} />
        <Route
          path="/cart"
          element={
            <StaffOnly>
              <Cart />
            </StaffOnly>
          }
        />
        <Route
          path="/coupons"
          element={
            <StaffOnly>
              <Coupons />
            </StaffOnly>
          }
        />
        <Route
          path="/users"
          element={
            <StaffOnly>
              <Users />
            </StaffOnly>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <StaffOnly>
              <UserEdit />
            </StaffOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
