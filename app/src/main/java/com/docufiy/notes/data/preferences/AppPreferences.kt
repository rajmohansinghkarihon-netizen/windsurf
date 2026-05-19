package com.docufiy.notes.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "app_preferences")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val DARK_MODE = booleanPreferencesKey("dark_mode")
        val ACCENT_COLOR = longPreferencesKey("accent_color")
        val VIEW_MODE = stringPreferencesKey("view_mode") // list or grid
        val SORT_MODE = stringPreferencesKey("sort_mode") // date or title
        val AUTO_SAVE = booleanPreferencesKey("auto_save")
        val DEFAULT_FONT_SIZE = stringPreferencesKey("default_font_size")
        val TYPING_MODE = stringPreferencesKey("typing_mode") // english or hinglish
        val APP_LOCK_ENABLED = booleanPreferencesKey("app_lock_enabled")
    }

    val darkMode: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[DARK_MODE] ?: false
    }

    val accentColor: Flow<Long> = context.dataStore.data.map { prefs ->
        prefs[ACCENT_COLOR] ?: 0xFF6750A4
    }

    val viewMode: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[VIEW_MODE] ?: "list"
    }

    val sortMode: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SORT_MODE] ?: "date"
    }

    val autoSave: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[AUTO_SAVE] ?: true
    }

    val defaultFontSize: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[DEFAULT_FONT_SIZE] ?: "16"
    }

    val typingMode: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[TYPING_MODE] ?: "english"
    }

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { it[DARK_MODE] = enabled }
    }

    suspend fun setAccentColor(color: Long) {
        context.dataStore.edit { it[ACCENT_COLOR] = color }
    }

    suspend fun setViewMode(mode: String) {
        context.dataStore.edit { it[VIEW_MODE] = mode }
    }

    suspend fun setSortMode(mode: String) {
        context.dataStore.edit { it[SORT_MODE] = mode }
    }

    suspend fun setAutoSave(enabled: Boolean) {
        context.dataStore.edit { it[AUTO_SAVE] = enabled }
    }

    suspend fun setDefaultFontSize(size: String) {
        context.dataStore.edit { it[DEFAULT_FONT_SIZE] = size }
    }

    suspend fun setTypingMode(mode: String) {
        context.dataStore.edit { it[TYPING_MODE] = mode }
    }

    val appLockEnabled: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[APP_LOCK_ENABLED] ?: false
    }

    suspend fun setAppLockEnabled(enabled: Boolean) {
        context.dataStore.edit { it[APP_LOCK_ENABLED] = enabled }
    }
}
