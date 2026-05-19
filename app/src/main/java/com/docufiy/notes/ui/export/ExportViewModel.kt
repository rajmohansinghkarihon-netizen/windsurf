package com.docufiy.notes.ui.export

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.local.entity.NoteExportEntity
import com.docufiy.notes.data.repository.NoteRepository
import com.docufiy.notes.util.ExportUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExportUiState(
    val note: NoteEntity? = null,
    val blocks: List<NoteBlockEntity> = emptyList(),
    val format: String = "pdf",
    val pageSize: ExportUtils.PageSize = ExportUtils.PageSize.A4,
    val resolution: ExportUtils.Resolution = ExportUtils.Resolution.FHD,
    val quality: Int = 100,
    val includeImages: Boolean = true,
    val includeBackground: Boolean = true,
    val isExporting: Boolean = false,
    val exportedFilePath: String? = null,
    val error: String? = null,
    val progress: Float = 0f
)

@HiltViewModel
class ExportViewModel @Inject constructor(
    private val repository: NoteRepository,
    @ApplicationContext private val appContext: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val noteId: Long = savedStateHandle.get<Long>("noteId") ?: -1L

    private val _uiState = MutableStateFlow(ExportUiState())
    val uiState: StateFlow<ExportUiState> = _uiState.asStateFlow()

    init {
        loadNote()
    }

    private fun loadNote() {
        viewModelScope.launch {
            val note = repository.getNoteById(noteId)
            val blocks = repository.getBlocksForNoteOnce(noteId)
            _uiState.value = _uiState.value.copy(note = note, blocks = blocks)
        }
    }

    fun setFormat(format: String) {
        _uiState.value = _uiState.value.copy(format = format)
    }

    fun setPageSize(pageSize: ExportUtils.PageSize) {
        _uiState.value = _uiState.value.copy(pageSize = pageSize)
    }

    fun setResolution(resolution: ExportUtils.Resolution) {
        _uiState.value = _uiState.value.copy(resolution = resolution)
    }

    fun setQuality(quality: Int) {
        _uiState.value = _uiState.value.copy(quality = quality)
    }

    fun setIncludeImages(include: Boolean) {
        _uiState.value = _uiState.value.copy(includeImages = include)
    }

    fun setIncludeBackground(include: Boolean) {
        _uiState.value = _uiState.value.copy(includeBackground = include)
    }

    fun export() {
        val note = _uiState.value.note ?: return
        val blocks = _uiState.value.blocks

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isExporting = true, error = null, progress = 0.1f)

            try {
                val options = ExportUtils.ExportOptions(
                    pageSize = _uiState.value.pageSize,
                    quality = _uiState.value.quality,
                    includeImages = _uiState.value.includeImages,
                    includeBackground = _uiState.value.includeBackground,
                    backgroundColor = note.backgroundColor
                )

                _uiState.value = _uiState.value.copy(progress = 0.3f)

                val filePath = when (_uiState.value.format) {
                    "pdf" -> ExportUtils.exportToPdf(appContext, note, blocks, options)
                    "png" -> ExportUtils.exportToPng(appContext, note, blocks, options, _uiState.value.resolution)
                    "txt" -> ExportUtils.exportToTxt(appContext, note, blocks)
                    else -> null
                }

                _uiState.value = _uiState.value.copy(progress = 0.8f)

                if (filePath != null) {
                    repository.insertExport(
                        NoteExportEntity(
                            noteId = noteId,
                            format = _uiState.value.format,
                            filePath = filePath,
                            pageSize = _uiState.value.pageSize.name,
                            quality = _uiState.value.quality
                        )
                    )
                    repository.addHistory(noteId, "exported", "Exported as ${_uiState.value.format.uppercase()}")

                    _uiState.value = _uiState.value.copy(
                        exportedFilePath = filePath,
                        isExporting = false,
                        progress = 1f
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = "Export failed",
                        isExporting = false,
                        progress = 0f
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Export failed",
                    isExporting = false,
                    progress = 0f
                )
            }
        }
    }
}
