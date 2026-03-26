import MeetingRequest from "../models/MeetingRequest.js";

// Create request
export const createRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;

    const roomId = "room_" + Date.now();

    const request = await MeetingRequest.create({
      senderId: req.user.id,
      receiverId,
      roomId,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get incoming requests
export const getRequests = async (req, res) => {
  try {
    const requests = await MeetingRequest.find({
      receiverId: req.user.id,
      status: "pending",
    }).populate("senderId", "name email");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Accept request
export const acceptRequest = async (req, res) => {
  try {
    const request = await MeetingRequest.findById(req.params.id);

    request.status = "accepted";
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject request
export const rejectRequest = async (req, res) => {
  try {
    const request = await MeetingRequest.findById(req.params.id);

    request.status = "rejected";
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get request status (for auto join)
export const getStatus = async (req, res) => {
  try {
    const request = await MeetingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      status: request.status,
      roomId: request.roomId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
