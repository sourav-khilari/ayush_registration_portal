import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationAPI } from '../api';
import { toast } from 'react-toastify';

function ApplicationsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await ApplicationAPI.getMyApplications();
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications');
      toast.error(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentStatusSummary = (documents) => {
    if (!documents || documents.length === 0) {
      return { verified: 0, rejected: 0, pending: 0, total: 0 };
    }
    
    const summary = {
      verified: 0,
      rejected: 0,
      pending: 0,
      total: documents.length,
    };

    documents.forEach(doc => {
      if (doc.verified_status === 'verified') summary.verified++;
      else if (doc.verified_status === 'rejected') summary.rejected++;
      else summary.pending++;
    });

    return summary;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <button
            onClick={() => navigate('/StartupOwner/startup-application')}
            className="px-4 py-2 bg-ayush-500 text-white rounded-md hover:bg-ayush-600"
          >
            New Application
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">No applications found.</p>
            <button
              onClick={() => navigate('/StartupOwner/startup-application')}
              className="px-4 py-2 bg-ayush-500 text-white rounded-md hover:bg-ayush-600"
            >
              Create New Application
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const docSummary = getDocumentStatusSummary(app.documents);
              const hasRejected = docSummary.rejected > 0;

              return (
                <div
                  key={app._id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/StartupOwner/applications/${app._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {app.startup_id?.name || 'Application'}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                          {app.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                        </span>
                        {hasRejected && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            Action Required
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Sector</p>
                          <p className="font-medium capitalize">{app.sector}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Application Type</p>
                          <p className="font-medium capitalize">
                            {app.application_type?.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Submitted</p>
                          <p className="font-medium">
                            {app.submitted_at
                              ? new Date(app.submitted_at).toLocaleDateString()
                              : 'Not submitted'}
                          </p>
                        </div>
                      </div>

                      {/* Document Status Summary */}
                      {docSummary.total > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Documents:</span>
                          <span className="text-green-600 font-medium">
                            {docSummary.verified} Verified
                          </span>
                          {docSummary.rejected > 0 && (
                            <span className="text-red-600 font-medium">
                              {docSummary.rejected} Rejected
                            </span>
                          )}
                          <span className="text-yellow-600 font-medium">
                            {docSummary.pending} Pending
                          </span>
                        </div>
                      )}

                      {app.reviewer_comment && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-900">Reviewer Comment:</p>
                          <p className="text-sm text-blue-800 mt-1">{app.reviewer_comment}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/StartupOwner/applications/${app._id}`);
                      }}
                      className="ml-4 px-4 py-2 bg-ayush-500 text-white rounded-md hover:bg-ayush-600"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/StartupOwner/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApplicationsList;



