import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HistoryPage from "./pages/HistoryPage";
import PDFLibrary from "./pages/PDFLibrary";
import PDFReadingView from "./pages/PDFReadingView";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<PDFLibrary />} />
      <Route path="/open" element={<PDFLibrary />} />
      <Route path="/library" element={<PDFLibrary />} />
      <Route path="/historico" element={<HistoryPage />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/library" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/library" replace /> : <RegisterPage />}
      />
      <Route
        path="/library/:pdfId"
        element={
          <ProtectedRoute>
            <PDFReadingView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
