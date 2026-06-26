import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import PDFLibrary from "./pages/PDFLibrary";
import PDFReadingView from "./pages/PDFReadingView";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/library" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/library" replace /> : <Login />}
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <PDFLibrary />
          </ProtectedRoute>
        }
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
