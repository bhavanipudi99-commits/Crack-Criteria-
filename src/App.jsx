import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserApp from './components/user/UserApp';
import AdminApp from './components/admin/AdminApp';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<UserApp />} />
      </Routes>
    </Router>
  );
}
