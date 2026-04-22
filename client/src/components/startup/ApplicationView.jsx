import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationAPI, DocumentAPI } from '../../api';
import { toast } from 'react-toastify';
import ApplicationTracker from './ApplicationTracker';

function ApplicationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [replacingDocId, setReplacingDocId] = useState(null);
  const [error, setError] = useState('');

  const loadApplication = useCallback(async () => {
    try {
      setLoading(true);
      // Check if this is a virtual application (from documents without Application record)
      if (id && id.startsWith('virtual_')) {
        setError('This is a legacy application. Please view it from the applications list.');
        setLoading(false);
        return;
      }
      const res = await ApplicationAPI.getMyApplication(id);
      if (res.success) {
        setApplication(res.application);
        setRequirements(res.requirements || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load application');
      toast.error(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleReplaceDocument = async (docId, file) => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setReplacingDocId(docId);
      const res = await DocumentAPI.replace(docId, file);
      if (res.success) {
        toast.success('Document replaced successfully. Verification in progress.');
        await loadApplication(); // Reload to show updated status
      }
    } catch (err) {
      toast.error(err.message || 'Failed to replace document');
    } finally {
      setReplacingDocId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return status || 'Unknown';
    }
  };

  const getApplicationStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Application not found'}</p>
          <button
            onClick={() => navigate('/StartupOwner/applications')}
            className="px-4 py-2 bg-ayush-500 text-white rounded-md hover:bg-ayush-600"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  // Create a map of documents by category
  const documentsByCategory = {};
  (application.documents || []).forEach(doc => {
    documentsByCategory[doc.doc_category_declared] = doc;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
              <p className="text-gray-600 mt-1">
                {application.startup_id?.name || 'Startup Application'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getApplicationStatusColor(application.status)}`}>
              {application.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Sector</p>
              <p className="font-medium capitalize">{application.sector}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Application Type</p>
              <p className="font-medium capitalize">{application.application_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="font-medium">
                {application.submitted_at 
                  ? new Date(application.submitted_at).toLocaleDateString()
                  : 'Not submitted'}
              </p>
            </div>
          </div>

          {application.reviewer_comment && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-900">Reviewer Comment:</p>
              <p className="text-blue-800 mt-1">{application.reviewer_comment}</p>
            </div>
          )}
        </div>

        <ApplicationTracker application={application} requirements={requirements} />

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Documents</h2>
          
          {requirements.length === 0 ? (
            <p className="text-gray-500">No document requirements found.</p>
          ) : (
            <div className="space-y-4">
              {requirements.map((req, index) => {
                const doc = documentsByCategory[req.doc_category];
                const isRequired = req.required !== false;
                const isRejected = doc?.verified_status === 'rejected';

                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      isRejected ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {req.doc_category?.replace('_', ' ')}
                          </h3>
                          {isRequired && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              Required
                            </span>
                          )}
                          {!isRequired && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              Optional
                            </span>
                          )}
                        </div>
                        
                        {req.note && (
                          <p className="text-sm text-gray-600 mb-2">{req.note}</p>
                        )}

                        {doc ? (
                          <div className="mt-3">
                            <div className="flex items-center gap-4 mb-2">
                              <span className="text-sm text-gray-600">
                                File: {doc.document_name || doc.filename}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.verified_status)}`}>
                                {getStatusLabel(doc.verified_status)}
                              </span>
                            </div>

                            {isRejected && doc.rejection_reason && (
                              <div className="mt-2 p-3 bg-red-100 rounded-md">
                                <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                                <p className="text-sm text-red-800 mt-1">{doc.rejection_reason}</p>
                              </div>
                            )}

                            {isRejected && (
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Replace Document:
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleReplaceDocument(doc._id, file);
                                      }
                                    }}
                                    disabled={replacingDocId === doc._id}
                                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ayush-50 file:text-ayush-700 hover:file:bg-ayush-100 disabled:opacity-50"
                                  />
                                  {replacingDocId === doc._id && (
                                    <span className="text-sm text-gray-500">Uploading...</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {doc.fileUrl && (
                              <a
                                href={`${import.meta.env.VITE_API_BASE || ''}${doc.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-sm text-ayush-600 hover:text-ayush-700"
                              >
                                View Document →
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500 italic">
                              {isRequired ? 'Document not uploaded' : 'Document not provided'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review History */}
        {application.review_history && application.review_history.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review History</h2>
            <div className="space-y-3">
              {application.review_history.map((history, index) => (
                <div key={index} className="border-l-4 border-ayush-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{history.action?.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(history.at).toLocaleString()}
                    </span>
                  </div>
                  {history.by && (
                    <p className="text-sm text-gray-600 mt-1">
                      By: {history.by?.name || history.by_role || 'System'}
                    </p>
                  )}
                  {history.comment && (
                    <p className="text-sm text-gray-700 mt-1">{history.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/StartupOwner/applications')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back to Applications
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApplicationView;

