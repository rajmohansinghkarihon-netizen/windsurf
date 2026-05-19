package com.docufiy.notes.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.preferences.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val darkMode: Boolean = false,
    val accentColor: Long = 0xFF6750A4,
    val autoSave: Boolean = true,
    val defaultFontSize: String = "16",
    val typingMode: String = "english",
    val appLockEnabled: Boolean = false
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferences: AppPreferences
) : ViewModel() {

    val uiState: StateFlow<SettingsUiState> = com.docufiy.notes.util.combine6(
        preferences.darkMode,
        preferences.accentColor,
        preferences.autoSave,
        preferences.defaultFontSize,
        preferences.typingMode,
        preferences.appLockEnabled
    ) { darkMode, accentColor, autoSave, fontSize, typingMode, appLock ->
        SettingsUiState(
            darkMode = darkMode,
            accentColor = accentColor,
            autoSave = autoSave,
            defaultFontSize = fontSize,
            typingMode = typingMode,
            appLockEnabled = appLock
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SettingsUiState()
    )

    fun setDarkMode(enabled: Boolean) {
        viewModelScope.launch { preferences.setDarkMode(enabled) }
    }

    fun setAccentColor(color: Long) {
        viewModelScope.launch { preferences.setAccentColor(color) }
    }

    fun setAutoSave(enabled: Boolean) {
        viewModelScope.launch { preferences.setAutoSave(enabled) }
    }

    fun setDefaultFontSize(size: String) {
        viewModelScope.launch { preferences.setDefaultFontSize(size) }
    }

    fun setTypingMode(mode: String) {
        viewModelScope.launch { preferences.setTypingMode(mode) }
    }

    fun setAppLockEnabled(enabled: Boolean) {
        viewModelScope.launch { preferences.setAppLockEnabled(enabled) }
    }
}
