import React from "react";

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>MediVault Hospital</h1>
      <p>If you can see this, the basic React app is working!</p>
      <p>Testing deployment... Version 3 - Connected to medivault-hospital</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}

export default App;
