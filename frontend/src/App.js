import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home.js";
import GameLoop from "./pages/gameloop.js";
import HostLobby from "./pages/Hostlobby.js";
import ULobby from "./pages/uLobby.js";
import HostComponent from "./pages/hostPage.js";
import EndGameComponent from "./pages/clientEnd.js";
import EndgameScreen from "./components/EndgameScreen.js";

export default function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/gameloop" element={<GameLoop />} />
          <Route path="/hostlobby" element={<HostLobby />} />
          <Route path="/lobby" element={<ULobby />} />
          <Route path="/host" element={<HostComponent />} />
          <Route path="/clientEnd" element={<EndGameComponent />}/>
          <Route path="/endgame" element={<EndgameScreen />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
