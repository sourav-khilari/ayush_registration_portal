import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function VideoCall() {
  const { room } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const jitsiContainerRef = useRef(null);

  useEffect(() => {
    const domain = "meet.jit.si";

    const options = {
      roomName: room,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: user?.name || "Guest",
      },
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    return () => api.dispose();
  }, [room, user]);

  return (
    <div className="h-screen bg-black relative">
      {/* Video Container */}
      <div ref={jitsiContainerRef} className="w-full h-full" />

      {/* End Call Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-red-600 px-6 py-3 rounded-full text-white"
      >
        End Call
      </button>
    </div>
  );
}
