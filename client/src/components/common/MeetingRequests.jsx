import React, { useEffect, useState } from "react";
import { getRequests, acceptRequest, rejectRequest } from "../../api/meetApi";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function MeetingRequests() {
  const [requests, setRequests] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();

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

  const handleAccept = async (id) => {
    const res = await acceptRequest(id, token);
    navigate(`/call/${res.data.roomId}`);
  };

  const handleReject = async (id) => {
    await rejectRequest(id, token);
    fetchRequests();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Incoming Calls</h2>

      {requests.length === 0 && <p>No requests</p>}

      {requests.map((req) => (
        <div
          key={req._id}
          className="border p-3 rounded mb-2 flex justify-between"
        >
          <span>{req.senderId.name}</span>

          <div>
            <button
              onClick={() => handleAccept(req._id)}
              className="bg-green-500 text-white px-3 py-1 mr-2 rounded"
            >
              Accept
            </button>

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
