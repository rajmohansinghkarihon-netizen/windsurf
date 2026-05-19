package com.docufiy.notes.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.local.entity.NoteHistoryEntity
import com.docufiy.notes.data.repository.NoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryUiState(
    val recentlyEdited: List<NoteHistoryEntity> = emptyList(),
    val recentlyExported: List<NoteHistoryEntity> = emptyList(),
    val recentlyDeleted: List<NoteHistoryEntity> = emptyList(),
    val deletedNotes: List<NoteEntity> = emptyList(),
    val selectedTab: Int = 0
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: NoteRepository
) : ViewModel() {

    private val _selectedTab = MutableStateFlow(0)

    val uiState: StateFlow<HistoryUiState> = combine(
        repository.getRecentlyEdited(),
        repository.getRecentlyExported(),
        repository.getRecentlyDeleted(),
        repository.getDeletedNotes(),
        _selectedTab
    ) { edited, exported, deleted, deletedNotes, tab ->
        HistoryUiState(
            recentlyEdited = edited,
            recentlyExported = exported,
            recentlyDeleted = deleted,
            deletedNotes = deletedNotes,
            selectedTab = tab
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HistoryUiState()
    )

    fun selectTab(index: Int) {
        _selectedTab.value = index
    }

    fun restoreNote(noteId: Long) {
        viewModelScope.launch { repository.restoreNote(noteId) }
    }

    fun permanentlyDelete(note: NoteEntity) {
        viewModelScope.launch { repository.permanentlyDeleteNote(note) }
    }
}
