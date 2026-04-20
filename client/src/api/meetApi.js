import axios from "axios";

const API = "/api/meet";

// Send request
export const sendRequest = (payload, token) => {
  return axios.post(
    `${API}/request`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

// Get incoming requests
export const getRequests = (token) => {
  return axios.get(`${API}/requests`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Accept request
export const acceptRequest = (id, slotIndex, token) => {
  return axios.post(
    `${API}/accept/${id}`,
    { slotIndex },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

// Reject request
export const rejectRequest = (id, token) => {
  return axios.post(
    `${API}/reject/${id}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};
