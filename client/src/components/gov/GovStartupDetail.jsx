import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  FaLeaf,
  FaHome,
  FaFileAlt,
  FaDownload,
  FaEye,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { StartupAPI, DocumentAPI } from "../../api";

export default function GovStartupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [startup, setStartup] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getDocumentUrl = (doc) => {
    if (!doc?.fileUrl) return null;
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const uploadBase = apiBase.replace(/\/api\/?$/, "") || window.location.origin;
    return `${uploadBase}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`;
  };

  useEffect(() => {
    if (user && user.role !== "gov_official" && user.role !== "admin") {
      navigate("/user/dashboard", { replace: true });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [s, docRes] = await Promise.all([
          StartupAPI.get(id),
          DocumentAPI.list({ startup_id: id }).catch(() => ({ documents: [] })),
        ]);
        if (!mounted) return;
        setStartup(s);
        setDocuments(docRes.documents || []);
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load startup");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading startup details…</p>
        </div>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error || "Startup not found."}</p>
          <button
            onClick={() => navigate("/gov/dashboard")}
            className="px-4 py-2 bg-ayush-600 text-white rounded hover:bg-ayush-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
              <span className="ml-4 text-sm text-gray-500 hidden sm:inline">
                Government Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-700 hover:text-ayush-600 flex items-center">
                <FaHome className="mr-2" /> Home
              </Link>
              <span className="hidden sm:block text-gray-700">{user?.name}</span>
              <button onClick={logout} className="text-sm text-red-600 hover:text-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/gov/dashboard")}
          className="inline-flex items-center text-sm text-gray-600 hover:text-ayush-700 mb-6"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
          <p className="text-gray-600 mt-1">
            {startup.founder_name} • {startup.email}
          </p>
          <div className="mt-2 flex gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-ayush-50 text-ayush-700">
              {startup.status?.replace("_", " ") || "—"}
            </span>
            {startup.startup_type && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {startup.startup_type}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaFileAlt className="mr-2 text-ayush-600" />
            Documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents available for this startup.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const docUrl = getDocumentUrl(doc);
                return (
                  <li key={doc._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.document_name || doc.filename || "Document"}
                      </div>
                      {doc.doc_category_declared && (
                        <div className="text-xs text-gray-500">
                          {doc.doc_category_declared.replace("_", " ")}
                        </div>
                      )}
                    </div>
                    {docUrl && (
                      <div className="flex gap-2">
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-ayush-50 text-ayush-700 hover:bg-ayush-100"
                        >
                          <FaEye className="mr-1" /> View
                        </a>
                        <a
                          href={docUrl}
                          download={(doc.document_name || doc.filename || "document").split("/").pop()}
                          className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          <FaDownload className="mr-1" /> Download
                        </a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
