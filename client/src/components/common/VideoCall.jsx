import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useAuth } from "../../context/AuthContext";

export default function VideoCall() {
  const { room } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const apiRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const domain = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
  const roomName = useMemo(() => {
    const raw = String(room || "").trim();
    // Jitsi room: allow letters/numbers/_/-
    const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "-");
    return cleaned || "ayush-room";
  }, [room]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Video Call</h1>
            <p className="text-xs text-gray-300">
              Room: {roomName} • {user?.name || "User"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const link = `${window.location.origin}/call/${encodeURIComponent(roomName)}`;
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch (_) {}
              }}
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              title="Copy call link to share"
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              onClick={() => {
                try {
                  apiRef.current?.executeCommand?.("hangup");
                } catch (_) {}
                navigate(-1);
              }}
              className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-sm font-semibold"
            >
              End Call
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              Back
            </button>
          </div>
        </div>

        {!token ? (
          <div className="bg-red-900/40 border border-red-800 rounded p-3 text-sm">
            Please login to join the call.
          </div>
        ) : (
          <div className="bg-black rounded-lg overflow-hidden" style={{ height: "75vh" }}>
            <JitsiMeeting
              domain={domain}
              roomName={roomName}
              userInfo={{ displayName: user?.name || user?.email || "User" }}
              getIFrameRef={(node) => {
                if (node) {
                  node.style.height = "75vh";
                  node.style.width = "100%";
                }
              }}
              onApiReady={(externalApi) => {
                apiRef.current = externalApi;
              }}
              onReadyToClose={() => navigate(-1)}
              configOverwrite={{
                prejoinPageEnabled: true,
                disableThirdPartyRequests: true,
                enableWelcomePage: false,
              }}
              interfaceConfigOverwrite={{
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

