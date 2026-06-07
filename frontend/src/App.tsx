import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginSelect from "./pages/LoginSelect";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
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
            <StudentPortal />
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
