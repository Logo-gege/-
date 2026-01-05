
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("仙途开启：灵识初始化中...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("致命错误：找不到根节点 #root");
  throw new Error("Could not find root element");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("法阵就绪：React 渲染完成");
} catch (err) {
  console.error("仙法失效：渲染过程出错", err);
}
