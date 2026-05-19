package com.docufiy.notes.ui.saved

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.preferences.AppPreferences
import com.docufiy.notes.data.repository.NoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SavedNotesUiState(
    val notes: List<NoteEntity> = emptyList(),
    val viewMode: String = "list",
    val sortMode: String = "date",
    val searchQuery: String = "",
    val isSearching: Boolean = false
)

@HiltViewModel
class SavedNotesViewModel @Inject constructor(
    private val repository: NoteRepository,
    private val preferences: AppPreferences
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _sortMode = MutableStateFlow("date")
    private val _viewMode = MutableStateFlow("list")

    val uiState: StateFlow<SavedNotesUiState> = combine(
        repository.getAllNotes(),
        _searchQuery,
        _sortMode,
        _viewMode
    ) { notes, query, sort, view ->
        val filtered = if (query.isBlank()) notes
        else notes.filter { it.title.contains(query, ignoreCase = true) }

        val sorted = when (sort) {
            "title" -> filtered.sortedBy { it.title.lowercase() }
            else -> filtered.sortedByDescending { it.updatedAt }
        }

        SavedNotesUiState(
            notes = sorted,
            viewMode = view,
            sortMode = sort,
            searchQuery = query,
            isSearching = query.isNotBlank()
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SavedNotesUiState()
    )

    init {
        viewModelScope.launch {
            _viewMode.value = preferences.viewMode.first()
            _sortMode.value = preferences.sortMode.first()
        }
    }

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    fun setSortMode(mode: String) {
        _sortMode.value = mode
        viewModelScope.launch { preferences.setSortMode(mode) }
    }

    fun setViewMode(mode: String) {
        _viewMode.value = mode
        viewModelScope.launch { preferences.setViewMode(mode) }
    }

    fun deleteNote(noteId: Long) {
        viewModelScope.launch { repository.softDeleteNote(noteId) }
    }

    fun duplicateNote(noteId: Long) {
        viewModelScope.launch { repository.duplicateNote(noteId) }
    }

    fun renameNote(noteId: Long, newTitle: String) {
        viewModelScope.launch {
            val note = repository.getNoteById(noteId)
            note?.let { repository.updateNote(it.copy(title = newTitle)) }
        }
    }

    fun toggleFavorite(noteId: Long, isFavorite: Boolean) {
        viewModelScope.launch { repository.updateFavorite(noteId, !isFavorite) }
    }
}
