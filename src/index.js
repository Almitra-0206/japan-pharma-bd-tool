// EN: React application entry point
// JA: Reactアプリケーションのエントリーポイント
// ZH: React 应用程序入口文件

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
