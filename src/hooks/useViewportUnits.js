import { useEffect } from 'react'

export function useViewportUnits() {
  useEffect(() => {
    function calculateViewportUnits() {
      // Store full viewport dimensions for reference
      document.documentElement.style.setProperty('--viewport-width', window.screen.width + 'px')
      document.documentElement.style.setProperty('--viewport-height', window.screen.height + 'px')

      // Use window.innerHeight and window.innerWidth directly
      const actualHeight = window.innerHeight
      const actualWidth = window.innerWidth
      
      // Set app-width based on orientation
      const isLandscape = actualWidth > actualHeight
      const customWidth = isLandscape 
        ? actualHeight * 10 / 16  // calc(100dvh * 10 / 16) for landscape
        : actualWidth             // 100vw for portrait
      const appWidthUnit = customWidth / 100  // 1% of custom width
      document.documentElement.style.setProperty('--app-width', appWidthUnit + 'px')
      
      // Calculate scale factor for tablets only (768-1200px portrait)
      const isTablet = actualWidth >= 768 && actualWidth <= 1200 && !isLandscape
      let scaleFactor = 1.0
      
      if (isTablet) {
        const aspectRatio = actualWidth / actualHeight
        scaleFactor = aspectRatio < 0.6 
          ? 1.0 
          : Math.max(0.55, 1.0 - (aspectRatio - 0.6) * 1.2)
      }
      
      const elementWidthUnit = appWidthUnit * scaleFactor
      document.documentElement.style.setProperty('--element-width', elementWidthUnit + 'px')
    }

    // Calculate immediately on mount
    calculateViewportUnits()

    // Update on resize (debounced)
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(calculateViewportUnits, 150)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])
}
