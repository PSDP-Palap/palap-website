import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 1. Import your Home component
import Home from './Homepage.tsx' 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Put it on the screen */}
    <Home />
  </StrictMode>,
)