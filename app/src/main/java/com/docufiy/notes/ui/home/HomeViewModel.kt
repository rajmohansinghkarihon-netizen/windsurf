package com.docufiy.notes.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.preferences.AppPreferences
import com.docufiy.notes.data.repository.NoteRepository
import com.docufiy.notes.util.NoteTemplates
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val recentNotes: List<NoteEntity> = emptyList(),
    val favoriteNotes: List<NoteEntity> = emptyList(),
    val webClips: List<NoteEntity> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<NoteEntity> = emptyList(),
    val isSearching: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: NoteRepository,
    private val preferences: AppPreferences
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")

    val uiState: StateFlow<HomeUiState> = combine(
        repository.getRecentNotes(10),
        repository.getFavoriteNotes(),
        repository.getRecentWebImports(5),
        _searchQuery
    ) { recent, favorites, webClips, query ->
        HomeUiState(
            recentNotes = recent,
            favoriteNotes = favorites,
            webClips = webClips,
            searchQuery = query,
            isSearching = query.isNotBlank()
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState()
    )

    private val _searchResults = MutableStateFlow<List<NoteEntity>>(emptyList())
    val searchResults: StateFlow<List<NoteEntity>> = _searchResults.asStateFlow()

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
        if (query.isNotBlank()) {
            viewModelScope.launch {
                repository.searchNotes(query).collect { results ->
                    _searchResults.value = results
                }
            }
        } else {
            _searchResults.value = emptyList()
        }
    }

    fun createNewNote(onCreated: (Long) -> Unit) {
        viewModelScope.launch {
            val noteId = repository.insertNote(NoteEntity())
            repository.insertBlock(
                com.docufiy.notes.data.local.entity.NoteBlockEntity(
                    noteId = noteId,
                    type = "text",
                    orderIndex = 0
                )
            )
            onCreated(noteId)
        }
    }

    fun toggleFavorite(noteId: Long, isFavorite: Boolean) {
        viewModelScope.launch {
            repository.updateFavorite(noteId, !isFavorite)
        }
    }

    fun togglePin(noteId: Long, isPinned: Boolean) {
        viewModelScope.launch {
            repository.updatePinned(noteId, !isPinned)
        }
    }

    fun createNoteFromTemplate(templateId: String, onCreated: (Long) -> Unit) {
        viewModelScope.launch {
            val template = NoteTemplates.getTemplate(templateId) ?: return@launch
            val noteEntity = NoteEntity(
                title = template.name,
                templateType = templateId
            )
            val noteId = repository.insertNote(noteEntity)
            val blocks = NoteTemplates.createBlocksFromTemplate(template, noteId)
            repository.insertBlocks(blocks)
            onCreated(noteId)
        }
    }
}
