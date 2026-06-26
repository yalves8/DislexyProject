import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginSelect from "./pages/LoginSelect";
import Login from "./pages/Login";
import PDFLibrary from "./pages/PDFLibrary";
import PDFReadingView from "./pages/PDFReadingView";
import StudentLogin from "./pages/StudentLogin";
import StudentLibrary from "./pages/StudentLibrary";
import StudentPortalLegacy from "./pages/StudentPortalLegacy";
import StudentReadingView from "./pages/StudentReadingView";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Pública: seleção de perfil */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role === "student" ? "/student/portal" : "/teacher/dashboard"} replace />
            : <LoginSelect />
        }
      />

      {/* Login de aluno — redireciona se já autenticado */}
      <Route
        path="/student/login"
        element={user ? <Navigate to="/student/portal" replace /> : <StudentLogin />}
      />

      {/* Login de professor — redireciona se já autenticado */}
      <Route
        path="/teacher/login"
        element={user ? <Navigate to="/teacher/dashboard" replace /> : <TeacherLogin />}
      />

      {/* Protegidas */}
      <Route
        path="/student/portal"
        element={
          <ProtectedRoute role="student">
            <StudentLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/portal/:subjectId/:materialId"
        element={
          <ProtectedRoute role="student">
            <StudentReadingView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/legacy"
        element={
          <ProtectedRoute role="student">
            <StudentPortalLegacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* PDF Library routes */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
