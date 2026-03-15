import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { NavBar } from './components/NavBar';
import {
  HomePage,
  LoginPage,
  SignupPage,
  DashboardPage,
  RoomBuilderPage,
  JoinExperimentPage,
  ExperimentCatalogPage,
  ExperimentPage,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create-room" element={<RoomBuilderPage />} />
          <Route path="/join/:code" element={<JoinExperimentPage />} />
          <Route path="/experiments" element={<ExperimentCatalogPage />} />
          <Route path="/experiments/:id" element={<ExperimentPage />} />
          <Route path="/room/:code" element={<JoinExperimentPage />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
