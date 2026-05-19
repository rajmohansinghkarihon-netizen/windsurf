package com.docufiy.notes.ui.webimport

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.repository.NoteRepository
import com.docufiy.notes.util.ParsedWebPage
import com.docufiy.notes.util.WebContentBlock
import com.docufiy.notes.util.WebPageParser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WebImportUiState(
    val url: String = "",
    val isLoading: Boolean = false,
    val parsedPage: ParsedWebPage? = null,
    val error: String? = null,
    val isSaving: Boolean = false,
    val savedNoteId: Long? = null,
    val progress: String = ""
)

@HiltViewModel
class WebImportViewModel @Inject constructor(
    private val repository: NoteRepository,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(WebImportUiState())
    val uiState: StateFlow<WebImportUiState> = _uiState.asStateFlow()

    fun updateUrl(url: String) {
        _uiState.value = _uiState.value.copy(url = url, error = null)
    }

    fun fetchUrl() {
        val url = _uiState.value.url.trim()
        if (url.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Please enter a URL")
            return
        }

        val fullUrl = if (!url.startsWith("http://") && !url.startsWith("https://")) {
            "https://$url"
        } else url

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                parsedPage = null,
                progress = "Fetching webpage..."
            )

            val result = WebPageParser.fetchAndParse(fullUrl)

            result.fold(
                onSuccess = { parsed ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        parsedPage = parsed,
                        progress = "Found ${parsed.blocks.size} content blocks, ${parsed.imageUrls.size} images"
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Failed to fetch: ${error.message}",
                        progress = ""
                    )
                }
            )
        }
    }

    fun saveAsNote(onSaved: (Long) -> Unit) {
        val parsed = _uiState.value.parsedPage ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, progress = "Creating note...")

            val note = NoteEntity(
                title = parsed.title,
                templateType = "web_import"
            )
            val noteId = repository.insertNote(note)

            _uiState.value = _uiState.value.copy(progress = "Converting content...")
            val blocks = WebPageParser.convertToNoteBlocks(parsed, noteId)
            repository.insertBlocks(blocks)

            // Download images in background
            if (parsed.imageUrls.isNotEmpty()) {
                _uiState.value = _uiState.value.copy(progress = "Downloading images...")
                var downloadedCount = 0
                parsed.imageUrls.take(20).forEach { imageUrl ->
                    val localPath = WebPageParser.downloadImage(appContext, imageUrl, noteId)
                    if (localPath != null) {
                        downloadedCount++
                        _uiState.value = _uiState.value.copy(
                            progress = "Downloaded $downloadedCount/${parsed.imageUrls.size.coerceAtMost(20)} images..."
                        )
                    }
                }
            }

            _uiState.value = _uiState.value.copy(
                isSaving = false,
                savedNoteId = noteId,
                progress = "Note saved!"
            )

            onSaved(noteId)
        }
    }

    fun clearResult() {
        _uiState.value = WebImportUiState()
    }
}
