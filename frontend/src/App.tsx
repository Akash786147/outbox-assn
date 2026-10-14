import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/RouteGuards";
import { PageLoader } from "@/components/ui/Spinner";
import InboxPage from "@/pages/InboxPage";
import LoginPage from "@/pages/LoginPage";

// heavier pages (editor) are split out of the main bundle
const ComposePage = lazy(() => import("@/pages/ComposePage"));
const EmailDetailPage = lazy(() => import("@/pages/EmailDetailPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/scheduled" element={<InboxPage tab="scheduled" />} />
              <Route path="/sent" element={<InboxPage tab="sent" />} />
            </Route>
            <Route path="/compose" element={<ComposePage />} />
            <Route path="/emails/:id" element={<EmailDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/scheduled" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
