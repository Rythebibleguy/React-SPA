import './SettingsModal.css'
import BaseSlideUpModal from './BaseSlideUpModal'
import { useTheme } from '../contexts/ThemeContext'

function SettingsModal({ isOpen, onClose, onCloseStart }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <BaseSlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseStart={onCloseStart}
      title="Settings"
      compact
    >
      <div className="settings-modal__content">
        <div className="settings-modal__row">
          <span className="settings-modal__label">Dark mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Dark mode"
            className={`settings-modal__toggle ${isDark ? 'settings-modal__toggle--on' : ''}`}
            onClick={toggleTheme}
          >
            <span className="settings-modal__toggle-thumb" />
          </button>
        </div>
      </div>
    </BaseSlideUpModal>
  )
}

export default SettingsModal
