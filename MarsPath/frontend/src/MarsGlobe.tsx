import React from "react";

export default function MarsGlobe() {
  return React.createElement("model-viewer", {
    src: "/models/mars.glb",
    alt: "Interactive NASA 3D model of Mars",

    // Automatic rotation
    "auto-rotate": "",
    "auto-rotate-delay": "2000",
    "rotation-per-second": "3deg",

    // Allow manual rotation
    "camera-controls": "",

    // Disable zooming and panning
    "disable-zoom": "",
    "disable-pan": "",

    // Hide interaction prompts
    "interaction-prompt": "none",

    style: {
      display: "block",
      width: "100%",
      height: "100%",
      background: "transparent",
    },
  });
}

    
