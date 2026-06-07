import React from 'react';
import EarthASCII from './EarthASCII';
import './App.css';

export default function App() {
  return (
    <div className="App">
      <div className="halo" />
      <div className="stage">
        <EarthASCII />
      </div>
    </div>
  );
}
