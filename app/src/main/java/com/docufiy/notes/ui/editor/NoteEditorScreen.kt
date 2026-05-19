package com.docufiy.notes.ui.editor

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Scanner
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.docufiy.notes.ui.components.TagChips
import com.docufiy.notes.ui.components.VoiceInputPanel
import com.docufiy.notes.ui.editor.components.FormattingToolbar
import com.docufiy.notes.ui.editor.components.HinglishSuggestionChips
import com.docufiy.notes.ui.editor.components.NoteBlockEditor
import com.docufiy.notes.util.VoiceInputHelper
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditorScreen(
    onBack: () -> Unit,
    onOcr: () -> Unit,
    viewModel: NoteEditorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    var showVoiceInput by remember { mutableStateOf(false) }
    val voiceHelper = remember { VoiceInputHelper(context) }
    val voiceState by voiceHelper.state.collectAsState()

    DisposableEffect(Unit) {
        onDispose { voiceHelper.destroy() }
    }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.insertImage(it) }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        // Camera capture handled via content provider in production
    }

    val bgColor = uiState.note?.backgroundColor?.let { Color(it) } ?: MaterialTheme.colorScheme.background
    val isPinned = uiState.note?.isPinned ?: false

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("") },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.saveNote()
                        onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showVoiceInput = !showVoiceInput }) {
                        Icon(Icons.Default.Mic, "Voice Input")
                    }
                    IconButton(onClick = { viewModel.togglePin() }) {
                        Icon(
                            if (isPinned) Icons.Default.PushPin else Icons.Outlined.PushPin,
                            if (isPinned) "Unpin" else "Pin",
                            tint = if (isPinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = onOcr) {
                        Icon(Icons.Default.Scanner, "OCR Import")
                    }
                    IconButton(onClick = {
                        viewModel.saveNote()
                        scope.launch {
                            snackbarHostState.showSnackbar("Note saved")
                        }
                    }) {
                        Icon(Icons.Default.Save, "Save")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = bgColor
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            Column {
                // Voice input panel
                AnimatedVisibility(visible = showVoiceInput) {
                    VoiceInputPanel(
                        state = voiceState,
                        onStartListening = { lang -> voiceHelper.startListening(lang) },
                        onStopListening = { voiceHelper.stopListening() },
                        onInsertText = { text ->
                            viewModel.insertVoiceText(text)
                            voiceHelper.clearResult()
                            showVoiceInput = false
                        },
                        onClear = { voiceHelper.clearResult() },
                        onDismiss = {
                            voiceHelper.stopListening()
                            showVoiceInput = false
                        }
                    )
                }

                // Hinglish suggestions
                if (uiState.typingMode == "hinglish") {
                    HinglishSuggestionChips(
                        suggestions = uiState.hinglishSuggestions,
                        onSuggestionSelected = { viewModel.acceptHinglishSuggestion(it) }
                    )
                }

                // Formatting toolbar
                FormattingToolbar(
                    isBold = uiState.isBold,
                    isItalic = uiState.isItalic,
                    isUnderline = uiState.isUnderline,
                    fontSize = uiState.fontSize,
                    textColor = uiState.textColor,
                    highlightColor = uiState.highlightColor,
                    alignment = uiState.alignment,
                    typingMode = uiState.typingMode,
                    onToggleBold = viewModel::toggleBold,
                    onToggleItalic = viewModel::toggleItalic,
                    onToggleUnderline = viewModel::toggleUnderline,
                    onFontSizeChange = viewModel::setFontSize,
                    onTextColorChange = viewModel::setTextColor,
                    onHighlightColorChange = viewModel::setHighlightColor,
                    onAlignmentChange = viewModel::setAlignment,
                    onBlockTypeChange = viewModel::setBlockType,
                    onTypingModeChange = viewModel::setTypingMode,
                    onInsertImage = { imagePickerLauncher.launch("image/*") },
                    onBackgroundColorChange = viewModel::setBackgroundColor,
                    onUndo = viewModel::undo,
                    onRedo = viewModel::redo
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.addBlock("text") },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, "Add Block")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
                .padding(padding)
                .imePadding()
        ) {
            // Title
            BasicTextField(
                value = uiState.note?.title ?: "",
                onValueChange = { viewModel.updateTitle(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                textStyle = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                ),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                decorationBox = { innerTextField ->
                    Box {
                        if ((uiState.note?.title ?: "").isEmpty()) {
                            Text(
                                "Note Title",
                                style = TextStyle(
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                )
                            )
                        }
                        innerTextField()
                    }
                }
            )

            // Tags
            TagChips(
                tags = uiState.note?.tags ?: "",
                onTagsChanged = { viewModel.updateTags(it) },
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Typing mode indicator
            if (uiState.typingMode == "hinglish") {
                Text(
                    "\u0939\u093F\u0902\u0917\u094D\u0932\u093F\u0936 \u2192 \u0939\u093F\u0928\u094D\u0926\u0940 mode active",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Blocks
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp)
            ) {
                itemsIndexed(
                    items = uiState.blocks,
                    key = { index, block -> "${block.id}_$index" }
                ) { index, block ->
                    NoteBlockEditor(
                        block = block,
                        index = index,
                        isSelected = index == uiState.selectedBlockIndex,
                        onContentChange = { viewModel.updateBlockContent(index, it) },
                        onFocused = { viewModel.selectBlock(index) },
                        onDelete = {
                            if (block.type == "image") viewModel.deleteImageBlock(index)
                            else viewModel.deleteBlock(index)
                        }
                    )
                }

                item { Spacer(modifier = Modifier.height(100.dp)) }
            }
        }
    }
}
