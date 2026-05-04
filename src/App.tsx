import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { NavBar } from './components/NavBar';
import AutonomousVehicleExperiment from './experiments/AutonomousVehicleExperiment';
import {
  HomePage,
  LoginPage,
  SignupPage,
  ResetPasswordPage,
  DashboardPage,
  RoomBuilderPage,
  JoinExperimentPage,
  ExperimentCatalogPage,
  ExperimentPage,
  RoomLivePage,
  AIAssistantPage,
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
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create-room" element={<RoomBuilderPage />} />
          <Route path="/join/:code" element={<JoinExperimentPage />} />
          <Route path="/experiments" element={<ExperimentCatalogPage />} />
          <Route path="/experiments/:id" element={<ExperimentPage />} />
          <Route path="/room/:code" element={<JoinExperimentPage />} />
          <Route path="/room-live/:code" element={<RoomLivePage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/experiments/autonomous-vehicle" element={<AutonomousVehicleExperiment />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
