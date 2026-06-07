import { Routes, Route, Navigate } from "react-router-dom";
import LoginSelect from "./pages/LoginSelect";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginSelect />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/portal" element={<StudentPortal />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
