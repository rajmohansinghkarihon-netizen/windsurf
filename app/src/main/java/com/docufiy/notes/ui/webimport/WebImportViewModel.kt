package com.docufiy.notes.ui.webimport

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.repository.NoteRepository
import com.docufiy.notes.util.DownloadedImage
import com.docufiy.notes.util.ParsedWebPage
import com.docufiy.notes.util.WebPageParser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WebImportUiState(
    val url: String = "",
    val isLoading: Boolean = false,
    val parsedPage: ParsedWebPage? = null,
    val error: String? = null,
    val isSaving: Boolean = false,
    val savedNoteId: Long? = null,
    val progress: String = "",
    val progressPercent: Float = 0f,
    val downloadImages: Boolean = true
)

@HiltViewModel
class WebImportViewModel @Inject constructor(
    private val repository: NoteRepository,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(WebImportUiState())
    val uiState: StateFlow<WebImportUiState> = _uiState.asStateFlow()

    val recentWebImports = repository.getRecentWebImports(10)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun updateUrl(url: String) {
        _uiState.value = _uiState.value.copy(url = url, error = null)
    }

    fun toggleDownloadImages() {
        _uiState.value = _uiState.value.copy(downloadImages = !_uiState.value.downloadImages)
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
                progress = "Connecting to website...",
                progressPercent = 0.1f
            )

            val result = WebPageParser.fetchAndParse(fullUrl)

            result.fold(
                onSuccess = { parsed ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        parsedPage = parsed,
                        progress = "${parsed.blocks.size} blocks \u2022 ${parsed.imageUrls.size} images \u2022 ${parsed.wordCount} words \u2022 ~${parsed.estimatedReadTime} min read",
                        progressPercent = 1f
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Unknown error",
                        progress = "",
                        progressPercent = 0f
                    )
                }
            )
        }
    }

    fun saveAsNote(onSaved: (Long) -> Unit) {
        val parsed = _uiState.value.parsedPage ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSaving = true,
                progress = "Creating note...",
                progressPercent = 0.1f
            )

            val note = NoteEntity(
                title = parsed.title,
                templateType = "web_import",
                sourceUrl = parsed.sourceUrl,
                isWebImport = true,
                tags = "Web Clip"
            )
            val noteId = repository.insertNote(note)

            // Download images if enabled
            var downloadedImages = emptyMap<String, DownloadedImage>()
            if (_uiState.value.downloadImages && parsed.imageUrls.isNotEmpty()) {
                _uiState.value = _uiState.value.copy(
                    progress = "Downloading images...",
                    progressPercent = 0.2f
                )
                downloadedImages = WebPageParser.downloadAllImages(
                    appContext, parsed, noteId
                ) { downloaded, total ->
                    _uiState.value = _uiState.value.copy(
                        progress = "Downloading images ($downloaded/$total)...",
                        progressPercent = 0.2f + (0.6f * downloaded / total)
                    )
                }

                // Save image entities
                val imageEntities = WebPageParser.createNoteImageEntities(noteId, downloadedImages)
                imageEntities.forEach { repository.insertImage(it) }
            }

            _uiState.value = _uiState.value.copy(
                progress = "Saving content blocks...",
                progressPercent = 0.85f
            )

            val blocks = WebPageParser.convertToNoteBlocks(parsed, noteId, downloadedImages)
            repository.insertBlocks(blocks)

            repository.addHistory(noteId, "web_import", "Imported from ${parsed.sourceUrl}")

            _uiState.value = _uiState.value.copy(
                isSaving = false,
                savedNoteId = noteId,
                progress = "Saved! ${blocks.size} blocks, ${downloadedImages.size} images downloaded",
                progressPercent = 1f
            )

            onSaved(noteId)
        }
    }

    fun reFetchNote(noteId: Long, url: String, onDone: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                progress = "Re-fetching...",
                progressPercent = 0.1f
            )

            val result = WebPageParser.fetchAndParse(url)
            result.fold(
                onSuccess = { parsed ->
                    // Delete old blocks
                    repository.deleteAllBlocksForNote(noteId)

                    // Re-download images
                    val downloadedImages = if (_uiState.value.downloadImages) {
                        WebPageParser.downloadAllImages(appContext, parsed, noteId) { d, t ->
                            _uiState.value = _uiState.value.copy(
                                progress = "Re-downloading images ($d/$t)...",
                                progressPercent = 0.3f + (0.5f * d / t)
                            )
                        }
                    } else emptyMap()

                    val blocks = WebPageParser.convertToNoteBlocks(parsed, noteId, downloadedImages)
                    repository.insertBlocks(blocks)

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        progress = "Re-fetched successfully!",
                        progressPercent = 1f
                    )

                    onDone()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Re-fetch failed: ${error.message}",
                        progressPercent = 0f
                    )
                }
            )
        }
    }

    fun clearResult() {
        _uiState.value = WebImportUiState()
    }
}
