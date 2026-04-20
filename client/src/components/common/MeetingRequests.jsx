import React, { useEffect, useState } from "react";
import { getRequests, acceptRequest, rejectRequest } from "../../api/meetApi";
import { useAuth } from "../../context/AuthContext";

export default function MeetingRequests() {
  const [requests, setRequests] = useState([]);
  const { token } = useAuth();

  const fetchRequests = async () => {
    try {
      const res = await getRequests(token);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (id, slotIndex) => {
    const res = await acceptRequest(id, slotIndex, token);
    alert(
      `Meeting scheduled. Google Meet link shared on email.\n${res?.data?.google_meet_link || "https://meet.google.com/new"}`,
    );
    fetchRequests();
  };

  const handleReject = async (id) => {
    await rejectRequest(id, token);
    fetchRequests();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Meeting Requests</h2>

      {requests.length === 0 && <p>No requests</p>}

      {requests.map((req) => (
        <div
          key={req._id}
          className="border p-3 rounded mb-2 flex justify-between"
        >
          <div>
            <div className="font-semibold">{req.senderId?.name || "Investor"}</div>
            <div className="text-xs text-gray-600">
              Startup: {req.startupId?.name || "—"}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Proposed slots:
              <div className="mt-1 space-y-1">
                {(req.proposed_slots || []).slice(0, 5).map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAccept(req._id, idx)}
                    className="block text-left w-full bg-green-50 hover:bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                    title="Accept this slot"
                  >
                    Accept: {new Date(s).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => handleReject(req._id)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
