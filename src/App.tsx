import React from "react";
import { Theme } from "@carbon/react";
import SpinnerApp from "./components/SpinnerApp";

const App: React.FC = () => {
  return (
    <Theme theme="white">
      <SpinnerApp />
    </Theme>
  );
};

export default App;
