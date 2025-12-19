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

function App() {
  return (
    <AuthProvider>
      <Router>
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
