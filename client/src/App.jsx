import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import LandingPage from "./components/common/LandingPage";
import Dashboard from "./components/startup/Dashboard";
import CompleteProfile from "./components/startup/CompleteProfile";
import StartupApplication from "./components/startup/StartupApplication";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import PrivateRoute from "./components/common/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";
import UserProfile from "./components/user/UserProfile";
import UserDashboard from "./components/user/UserDashboard";
import UserProfileEdit from "./components/user/UserProfileEdit";
import UserProfileView from "./components/user/UserProfileView";
import SubmittedApplication from "./components/startup/SubmittedApplication";
import StartupOwnerProfile from "./components/startup/StartupOwnerProfile";
import AyushGreenPage from "./components/webscrap/WebScrapping";
import ApplicationView from "./components/startup/ApplicationView";
import ApplicationsList from "./components/startup/ApplicationsList";
import InvestorDashboard from "./components/investor/InvestorDashboard";
import StartupDetail from "./components/investor/StartupDetail";
import StartupFinancialMatrix from "./components/startup/StartupFinancialMatrix";
import InvestorFinancialMatrix from "./components/investor/InvestorFinancialMatrix";
import GovDashboard from "./components/gov/GovDashboard";
import GovStartupDetail from "./components/gov/GovStartupDetail";
import StartupPage from "./features/startup/StartupPage";

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/webscrap" element={<AyushGreenPage />} />

          {/* Startup Owner Protected Routes */}
          <Route
            path="/StartupOwner/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/complete-profile"
            element={
              <PrivateRoute>
                <CompleteProfile />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/startup-application"
            element={
              <PrivateRoute>
                <StartupApplication />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/application/submitted"
            element={
              <PrivateRoute>
                <SubmittedApplication />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/applications"
            element={
              <PrivateRoute>
                <ApplicationsList />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/applications/:id"
            element={
              <PrivateRoute>
                <ApplicationView />
              </PrivateRoute>
            }
          />

          <Route
            path="/StartupOwner/profile"
            element={
              <PrivateRoute>
                <StartupOwnerProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/StartupOwner/profile/finacial-matrix"
            element={
              <PrivateRoute>
                <StartupFinancialMatrix />
              </PrivateRoute>
            }
          />

          <Route
            path="/startup-dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* New Startup Page with Profile Form & Preview */}
          <Route
            path="/StartupOwner/startup-profile"
            element={
              <PrivateRoute>
                <StartupPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/startup-profile"
            element={
              <PrivateRoute>
                <StartupPage />
              </PrivateRoute>
            }
          />

          {/* Regular User Routes */}
          <Route
            path="/user/profile"
            element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            }
          />

          <Route
            path="/user/dashboard"
            element={
              <PrivateRoute>
                <UserDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/user/profile/view"
            element={
              <PrivateRoute>
                <UserProfileView />
              </PrivateRoute>
            }
          />

          <Route
            path="/user/profile/edit"
            element={
              <PrivateRoute>
                <UserProfileEdit />
              </PrivateRoute>
            }
          />

          {/* Government Official / Admin Routes */}
          <Route
            path="/gov/dashboard"
            element={
              <PrivateRoute>
                <GovDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/gov/startups/:id"
            element={
              <PrivateRoute>
                <GovStartupDetail />
              </PrivateRoute>
            }
          />

          {/* Investor Routes */}
          <Route
            path="/investor/dashboard"
            element={
              <PrivateRoute>
                <InvestorDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/investor/startups/:id"
            element={
              <PrivateRoute>
                <StartupDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/investor/startups/:id/finacial-matrix"
            element={
              <PrivateRoute>
                <InvestorFinancialMatrix />
              </PrivateRoute>
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
