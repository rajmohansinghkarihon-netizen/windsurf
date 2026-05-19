package com.docufiy.notes.ui.editor

import android.content.Context
import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.local.entity.NoteImageEntity
import com.docufiy.notes.data.preferences.AppPreferences
import com.docufiy.notes.data.repository.NoteRepository
import com.docufiy.notes.util.HinglishTransliterator
import com.docufiy.notes.util.ImageUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditorUiState(
    val note: NoteEntity? = null,
    val blocks: List<NoteBlockEntity> = emptyList(),
    val selectedBlockIndex: Int = 0,
    val typingMode: String = "english", // english or hinglish
    val hinglishSuggestions: List<String> = emptyList(),
    val currentInputText: String = "",
    val isSaving: Boolean = false,
    val fontSize: Float = 16f,
    val isBold: Boolean = false,
    val isItalic: Boolean = false,
    val isUnderline: Boolean = false,
    val textColor: Long = 0xFF000000,
    val highlightColor: Long = 0x00000000,
    val alignment: String = "left",
    val fontFamily: String = "default",
    val undoStack: List<List<NoteBlockEntity>> = emptyList(),
    val redoStack: List<List<NoteBlockEntity>> = emptyList()
)

@HiltViewModel
class NoteEditorViewModel @Inject constructor(
    private val repository: NoteRepository,
    private val preferences: AppPreferences,
    @ApplicationContext private val appContext: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val noteId: Long = savedStateHandle.get<Long>("noteId") ?: -1L

    private val _uiState = MutableStateFlow(EditorUiState())
    val uiState: StateFlow<EditorUiState> = _uiState.asStateFlow()

    private var autoSaveJob: Job? = null

    init {
        loadNote()
        loadPreferences()
    }

    private fun loadNote() {
        viewModelScope.launch {
            if (noteId > 0) {
                val note = repository.getNoteById(noteId)
                val blocks = repository.getBlocksForNoteOnce(noteId)
                _uiState.value = _uiState.value.copy(
                    note = note,
                    blocks = blocks.ifEmpty {
                        listOf(NoteBlockEntity(noteId = noteId, type = "text", orderIndex = 0))
                    }
                )
            }
        }
    }

    private fun loadPreferences() {
        viewModelScope.launch {
            val mode = preferences.typingMode.first()
            _uiState.value = _uiState.value.copy(typingMode = mode)
        }
    }

    fun updateTitle(title: String) {
        val note = _uiState.value.note ?: return
        _uiState.value = _uiState.value.copy(note = note.copy(title = title))
        scheduleAutoSave()
    }

    fun updateBlockContent(index: Int, content: String) {
        val blocks = _uiState.value.blocks.toMutableList()
        if (index in blocks.indices) {
            saveUndoState()
            blocks[index] = blocks[index].copy(content = content)
            _uiState.value = _uiState.value.copy(blocks = blocks)

            if (_uiState.value.typingMode == "hinglish") {
                updateHinglishSuggestions(content)
            }
            scheduleAutoSave()
        }
    }

    fun selectBlock(index: Int) {
        if (index in _uiState.value.blocks.indices) {
            val block = _uiState.value.blocks[index]
            _uiState.value = _uiState.value.copy(
                selectedBlockIndex = index,
                isBold = block.isBold,
                isItalic = block.isItalic,
                isUnderline = block.isUnderline,
                fontSize = block.fontSize,
                textColor = block.textColor,
                highlightColor = block.highlightColor,
                alignment = block.alignment,
                fontFamily = block.fontFamily
            )
        }
    }

    fun addBlock(type: String, afterIndex: Int = _uiState.value.selectedBlockIndex) {
        saveUndoState()
        val blocks = _uiState.value.blocks.toMutableList()
        val newBlock = NoteBlockEntity(
            noteId = noteId,
            type = type,
            orderIndex = afterIndex + 1,
            fontSize = _uiState.value.fontSize,
            isBold = _uiState.value.isBold,
            isItalic = _uiState.value.isItalic,
            isUnderline = _uiState.value.isUnderline,
            textColor = _uiState.value.textColor,
            highlightColor = _uiState.value.highlightColor,
            alignment = _uiState.value.alignment,
            fontFamily = _uiState.value.fontFamily
        )
        blocks.add(afterIndex + 1, newBlock)
        // Re-index
        val reindexed = blocks.mapIndexed { i, b -> b.copy(orderIndex = i) }
        _uiState.value = _uiState.value.copy(
            blocks = reindexed,
            selectedBlockIndex = afterIndex + 1
        )
        scheduleAutoSave()
    }

    fun deleteBlock(index: Int) {
        val blocks = _uiState.value.blocks.toMutableList()
        if (blocks.size <= 1) return
        saveUndoState()
        blocks.removeAt(index)
        val reindexed = blocks.mapIndexed { i, b -> b.copy(orderIndex = i) }
        _uiState.value = _uiState.value.copy(
            blocks = reindexed,
            selectedBlockIndex = maxOf(0, index - 1)
        )
        scheduleAutoSave()
    }

    fun toggleBold() {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            saveUndoState()
            val newBold = !blocks[idx].isBold
            blocks[idx] = blocks[idx].copy(isBold = newBold)
            _uiState.value = _uiState.value.copy(blocks = blocks, isBold = newBold)
            scheduleAutoSave()
        }
    }

    fun toggleItalic() {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            saveUndoState()
            val newItalic = !blocks[idx].isItalic
            blocks[idx] = blocks[idx].copy(isItalic = newItalic)
            _uiState.value = _uiState.value.copy(blocks = blocks, isItalic = newItalic)
            scheduleAutoSave()
        }
    }

    fun toggleUnderline() {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            saveUndoState()
            val newUnderline = !blocks[idx].isUnderline
            blocks[idx] = blocks[idx].copy(isUnderline = newUnderline)
            _uiState.value = _uiState.value.copy(blocks = blocks, isUnderline = newUnderline)
            scheduleAutoSave()
        }
    }

    fun setFontSize(size: Float) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            blocks[idx] = blocks[idx].copy(fontSize = size)
            _uiState.value = _uiState.value.copy(blocks = blocks, fontSize = size)
            scheduleAutoSave()
        }
    }

    fun setTextColor(color: Long) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            blocks[idx] = blocks[idx].copy(textColor = color)
            _uiState.value = _uiState.value.copy(blocks = blocks, textColor = color)
            scheduleAutoSave()
        }
    }

    fun setHighlightColor(color: Long) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            blocks[idx] = blocks[idx].copy(highlightColor = color)
            _uiState.value = _uiState.value.copy(blocks = blocks, highlightColor = color)
            scheduleAutoSave()
        }
    }

    fun setAlignment(align: String) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            blocks[idx] = blocks[idx].copy(alignment = align)
            _uiState.value = _uiState.value.copy(blocks = blocks, alignment = align)
            scheduleAutoSave()
        }
    }

    fun setBlockType(type: String) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            saveUndoState()
            blocks[idx] = blocks[idx].copy(type = type)
            _uiState.value = _uiState.value.copy(blocks = blocks)
            scheduleAutoSave()
        }
    }

    fun setTypingMode(mode: String) {
        _uiState.value = _uiState.value.copy(typingMode = mode, hinglishSuggestions = emptyList())
        viewModelScope.launch { preferences.setTypingMode(mode) }
    }

    fun setBackgroundColor(color: Long) {
        val note = _uiState.value.note ?: return
        _uiState.value = _uiState.value.copy(note = note.copy(backgroundColor = color))
        viewModelScope.launch {
            repository.updateBackgroundColor(noteId, color)
        }
    }

    fun insertImage(uri: Uri) {
        viewModelScope.launch {
            val result = ImageUtils.saveImageToInternal(appContext, uri, noteId) ?: return@launch

            val imageEntity = NoteImageEntity(
                noteId = noteId,
                localPath = result.localPath,
                originalWidth = result.originalWidth,
                originalHeight = result.originalHeight,
                displayWidth = result.savedWidth,
                displayHeight = result.savedHeight,
                fileSize = result.fileSize
            )
            repository.insertImage(imageEntity)

            addBlock("image", _uiState.value.selectedBlockIndex)
            val blocks = _uiState.value.blocks.toMutableList()
            val imgIdx = _uiState.value.selectedBlockIndex
            if (imgIdx in blocks.indices) {
                blocks[imgIdx] = blocks[imgIdx].copy(
                    imageUri = result.localPath,
                    imageWidth = result.savedWidth,
                    imageHeight = result.savedHeight
                )
                _uiState.value = _uiState.value.copy(blocks = blocks)
            }
            scheduleAutoSave()
        }
    }

    fun deleteImageBlock(index: Int) {
        val blocks = _uiState.value.blocks
        if (index in blocks.indices && blocks[index].imageUri != null) {
            ImageUtils.deleteImage(blocks[index].imageUri!!)
        }
        deleteBlock(index)
    }

    fun insertOcrText(text: String) {
        addBlock("ocr_text", _uiState.value.selectedBlockIndex)
        val blocks = _uiState.value.blocks.toMutableList()
        val idx = _uiState.value.selectedBlockIndex
        if (idx in blocks.indices) {
            blocks[idx] = blocks[idx].copy(content = text)
            _uiState.value = _uiState.value.copy(blocks = blocks)
        }
        scheduleAutoSave()
    }

    fun acceptHinglishSuggestion(suggestion: String) {
        val idx = _uiState.value.selectedBlockIndex
        val blocks = _uiState.value.blocks.toMutableList()
        if (idx in blocks.indices) {
            val currentContent = blocks[idx].content
            val words = currentContent.split(" ").toMutableList()
            if (words.isNotEmpty()) {
                words[words.lastIndex] = suggestion
            }
            blocks[idx] = blocks[idx].copy(content = words.joinToString(" ") + " ")
            _uiState.value = _uiState.value.copy(
                blocks = blocks,
                hinglishSuggestions = emptyList()
            )
            scheduleAutoSave()
        }
    }

    private fun updateHinglishSuggestions(content: String) {
        val lastWord = content.trimEnd().split(" ").lastOrNull() ?: return
        if (lastWord.isBlank()) {
            _uiState.value = _uiState.value.copy(hinglishSuggestions = emptyList())
            return
        }
        val suggestions = HinglishTransliterator.getSuggestions(lastWord)
        _uiState.value = _uiState.value.copy(
            hinglishSuggestions = suggestions,
            currentInputText = lastWord
        )
    }

    fun undo() {
        val undoStack = _uiState.value.undoStack.toMutableList()
        if (undoStack.isEmpty()) return
        val previous = undoStack.removeLast()
        val redoStack = _uiState.value.redoStack.toMutableList()
        redoStack.add(_uiState.value.blocks)
        _uiState.value = _uiState.value.copy(
            blocks = previous,
            undoStack = undoStack,
            redoStack = redoStack
        )
        scheduleAutoSave()
    }

    fun redo() {
        val redoStack = _uiState.value.redoStack.toMutableList()
        if (redoStack.isEmpty()) return
        val next = redoStack.removeLast()
        val undoStack = _uiState.value.undoStack.toMutableList()
        undoStack.add(_uiState.value.blocks)
        _uiState.value = _uiState.value.copy(
            blocks = next,
            undoStack = undoStack,
            redoStack = redoStack
        )
        scheduleAutoSave()
    }

    private fun saveUndoState() {
        val undoStack = _uiState.value.undoStack.toMutableList()
        undoStack.add(_uiState.value.blocks)
        if (undoStack.size > 50) undoStack.removeFirst()
        _uiState.value = _uiState.value.copy(
            undoStack = undoStack,
            redoStack = emptyList()
        )
    }

    fun saveNote() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val note = _uiState.value.note ?: return@launch
            repository.updateNote(note.copy(isDraft = false))
            repository.deleteAllBlocksForNote(noteId)
            repository.insertBlocks(_uiState.value.blocks.map { it.copy(id = 0, noteId = noteId) })
            repository.addHistory(noteId, "edited")
            _uiState.value = _uiState.value.copy(isSaving = false)
        }
    }

    private fun scheduleAutoSave() {
        autoSaveJob?.cancel()
        autoSaveJob = viewModelScope.launch {
            delay(2000)
            saveNote()
        }
    }

    override fun onCleared() {
        super.onCleared()
        autoSaveJob?.cancel()
    }
}
