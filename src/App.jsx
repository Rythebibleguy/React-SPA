import './App.css'
import BottomNav from './components/BottomNav'
import { useViewportUnits } from './hooks/useViewportUnits'

function App() {
  useViewportUnits()

  return (
    <>
      <h1>Daily Bible Quiz</h1>
      <p>Ready to build your quiz!</p>
      <BottomNav />
    </>
  )
}

export default App
