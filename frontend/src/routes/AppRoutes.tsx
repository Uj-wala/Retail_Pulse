import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { LoginPage } from "../pages/auth/Login/LoginPage";
import { RegisterPage } from "../pages/auth/Register/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPassword/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPassword/ResetPasswordPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ProductsPage } from "../pages/products/ProductsPage";
import { CategoriesPage } from "../pages/categories/CategoriesPage";
import { InventoryPage } from "../pages/inventory/InventoryPage";
import { SalesPage } from "../pages/sales/SalesPage";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { CustomerProfilePage } from "../pages/customers/CustomerProfilePage";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { UsersPage } from "../pages/users/UsersPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { NotFoundPage } from "../pages/notfound/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/products", element: <ProductsPage /> },
          { path: "/categories", element: <CategoriesPage /> },
          { path: "/sales", element: <SalesPage /> },
          { path: "/customers", element: <CustomersPage /> },
          { path: "/customers/:id", element: <CustomerProfilePage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/profile", element: <ProfilePage /> },
          {
            element: <RoleRoute allow={["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"]} />,
            children: [
              { path: "/inventory", element: <InventoryPage /> },
              { path: "/analytics", element: <AnalyticsPage /> },
            ],
          },
          {
            element: <RoleRoute allow={["COMPANY_ADMIN", "SUPER_ADMIN"]} />,
            children: [
              { path: "/users", element: <UsersPage /> },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "*", element: <NotFoundPage /> },
]);
