import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function VideoCall() {
  const { room } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const jitsiContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.JitsiMeetExternalAPI) {
      console.error("Jitsi API not loaded");
      return;
    }

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
        enableLobby: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    // ✅ Try auto-click join (may or may not work depending on Jitsi)
    setTimeout(() => {
      const joinButton = document.querySelector(
        '[data-testid="prejoin.joinMeeting"]',
      );
      if (joinButton) {
        joinButton.click();
      }
    }, 2000);

    // ✅ Hide loading screen after short delay
    setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => api.dispose();
  }, [room, user]);

  return (
    <div className="h-screen bg-black relative">
      {/* ✅ LOADING SCREEN */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-50">
          <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg">Connecting to meeting...</p>
        </div>
      )}

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
