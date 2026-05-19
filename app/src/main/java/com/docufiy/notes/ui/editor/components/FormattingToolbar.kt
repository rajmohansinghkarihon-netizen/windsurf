package com.docufiy.notes.ui.editor.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.FormatAlignLeft
import androidx.compose.material.icons.automirrored.filled.FormatAlignRight
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.FormatAlignCenter
import androidx.compose.material.icons.filled.FormatBold
import androidx.compose.material.icons.filled.FormatColorFill
import androidx.compose.material.icons.filled.FormatColorText
import androidx.compose.material.icons.filled.FormatItalic
import androidx.compose.material.icons.filled.FormatListNumbered
import androidx.compose.material.icons.filled.FormatSize
import androidx.compose.material.icons.filled.FormatUnderlined
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.docufiy.notes.ui.theme.HighlightColors
import com.docufiy.notes.ui.theme.NoteBackgroundColors
import com.docufiy.notes.ui.theme.TextColors

@Composable
fun FormattingToolbar(
    isBold: Boolean,
    isItalic: Boolean,
    isUnderline: Boolean,
    fontSize: Float,
    textColor: Long,
    highlightColor: Long,
    alignment: String,
    typingMode: String,
    onToggleBold: () -> Unit,
    onToggleItalic: () -> Unit,
    onToggleUnderline: () -> Unit,
    onFontSizeChange: (Float) -> Unit,
    onTextColorChange: (Long) -> Unit,
    onHighlightColorChange: (Long) -> Unit,
    onAlignmentChange: (String) -> Unit,
    onBlockTypeChange: (String) -> Unit,
    onTypingModeChange: (String) -> Unit,
    onInsertImage: () -> Unit,
    onBackgroundColorChange: (Long) -> Unit,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showFontSizeMenu by remember { mutableStateOf(false) }
    var showTextColorPicker by remember { mutableStateOf(false) }
    var showHighlightColorPicker by remember { mutableStateOf(false) }
    var showBackgroundColorPicker by remember { mutableStateOf(false) }
    var showBlockTypeMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shadowElevation = 8.dp,
        color = MaterialTheme.colorScheme.surface
    ) {
        Column {
            // Main toolbar row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Undo/Redo
                ToolbarIconButton(Icons.AutoMirrored.Filled.Undo, "Undo", onClick = onUndo)
                ToolbarIconButton(Icons.AutoMirrored.Filled.Redo, "Redo", onClick = onRedo)

                ToolbarDivider()

                // Text formatting
                ToolbarIconButton(
                    Icons.Default.FormatBold, "Bold",
                    isActive = isBold,
                    onClick = onToggleBold
                )
                ToolbarIconButton(
                    Icons.Default.FormatItalic, "Italic",
                    isActive = isItalic,
                    onClick = onToggleItalic
                )
                ToolbarIconButton(
                    Icons.Default.FormatUnderlined, "Underline",
                    isActive = isUnderline,
                    onClick = onToggleUnderline
                )

                ToolbarDivider()

                // Font size
                Box {
                    ToolbarIconButton(
                        Icons.Default.FormatSize, "Font Size",
                        onClick = { showFontSizeMenu = true }
                    )
                    DropdownMenu(
                        expanded = showFontSizeMenu,
                        onDismissRequest = { showFontSizeMenu = false }
                    ) {
                        listOf(12f, 14f, 16f, 18f, 20f, 24f, 28f, 32f, 36f, 48f).forEach { size ->
                            DropdownMenuItem(
                                text = { Text("${size.toInt()}sp", fontSize = size.coerceAtMost(24f).sp) },
                                onClick = {
                                    onFontSizeChange(size)
                                    showFontSizeMenu = false
                                }
                            )
                        }
                    }
                }

                // Text color
                Box {
                    ToolbarIconButton(
                        Icons.Default.FormatColorText, "Text Color",
                        onClick = { showTextColorPicker = !showTextColorPicker }
                    )
                }

                // Highlight color
                Box {
                    ToolbarIconButton(
                        Icons.Default.FormatColorFill, "Highlight",
                        onClick = { showHighlightColorPicker = !showHighlightColorPicker }
                    )
                }

                ToolbarDivider()

                // Alignment
                ToolbarIconButton(
                    Icons.AutoMirrored.Filled.FormatAlignLeft, "Left",
                    isActive = alignment == "left",
                    onClick = { onAlignmentChange("left") }
                )
                ToolbarIconButton(
                    Icons.Default.FormatAlignCenter, "Center",
                    isActive = alignment == "center",
                    onClick = { onAlignmentChange("center") }
                )
                ToolbarIconButton(
                    Icons.AutoMirrored.Filled.FormatAlignRight, "Right",
                    isActive = alignment == "right",
                    onClick = { onAlignmentChange("right") }
                )

                ToolbarDivider()

                // Block types
                ToolbarIconButton(
                    Icons.AutoMirrored.Filled.FormatListBulleted, "Bullets",
                    onClick = { onBlockTypeChange("bullet") }
                )
                ToolbarIconButton(
                    Icons.Default.FormatListNumbered, "Numbered",
                    onClick = { onBlockTypeChange("numbered") }
                )

                // Block type selector
                Box {
                    ToolbarIconButton(
                        Icons.Default.TextFields, "Block Type",
                        onClick = { showBlockTypeMenu = true }
                    )
                    DropdownMenu(
                        expanded = showBlockTypeMenu,
                        onDismissRequest = { showBlockTypeMenu = false }
                    ) {
                        listOf("text" to "Text", "heading" to "Heading", "bullet" to "Bullet", "numbered" to "Numbered").forEach { (type, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    onBlockTypeChange(type)
                                    showBlockTypeMenu = false
                                }
                            )
                        }
                    }
                }

                ToolbarDivider()

                // Insert image
                ToolbarIconButton(
                    Icons.Default.AddPhotoAlternate, "Insert Image",
                    onClick = onInsertImage
                )

                // Background color
                Box {
                    ToolbarIconButton(
                        Icons.Default.Palette, "Page Background",
                        onClick = { showBackgroundColorPicker = !showBackgroundColorPicker }
                    )
                }

                ToolbarDivider()

                // Typing mode toggle
                ToolbarIconButton(
                    Icons.Default.Language,
                    if (typingMode == "english") "English" else "हिन्दी",
                    onClick = {
                        onTypingModeChange(if (typingMode == "english") "hinglish" else "english")
                    }
                )
            }

            // Color pickers
            AnimatedVisibility(visible = showTextColorPicker) {
                ColorPickerRow(
                    colors = TextColors,
                    selectedColor = Color(textColor),
                    onColorSelected = { color ->
                        onTextColorChange(colorToLong(color))
                        showTextColorPicker = false
                    }
                )
            }

            AnimatedVisibility(visible = showHighlightColorPicker) {
                ColorPickerRow(
                    colors = HighlightColors,
                    selectedColor = Color(highlightColor),
                    onColorSelected = { color ->
                        onHighlightColorChange(colorToLong(color))
                        showHighlightColorPicker = false
                    }
                )
            }

            AnimatedVisibility(visible = showBackgroundColorPicker) {
                ColorPickerRow(
                    colors = NoteBackgroundColors,
                    selectedColor = Color.White,
                    onColorSelected = { color ->
                        onBackgroundColorChange(colorToLong(color))
                        showBackgroundColorPicker = false
                    }
                )
            }
        }
    }
}

@Composable
private fun ToolbarIconButton(
    icon: ImageVector,
    contentDescription: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier.size(40.dp),
        colors = if (isActive) {
            IconButtonDefaults.iconButtonColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        } else {
            IconButtonDefaults.iconButtonColors()
        }
    ) {
        Icon(
            icon,
            contentDescription = contentDescription,
            modifier = Modifier.size(20.dp),
            tint = if (isActive) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun ToolbarDivider() {
    Spacer(modifier = Modifier.width(2.dp))
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(24.dp)
            .background(MaterialTheme.colorScheme.outlineVariant)
    )
    Spacer(modifier = Modifier.width(2.dp))
}

@Composable
private fun ColorPickerRow(
    colors: List<Color>,
    selectedColor: Color,
    onColorSelected: (Color) -> Unit
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(colors) { color ->
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(
                        width = if (color == selectedColor) 3.dp else 1.dp,
                        color = if (color == selectedColor) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                        shape = CircleShape
                    )
                    .clickable { onColorSelected(color) }
            )
        }
    }
}

@Composable
fun HinglishSuggestionChips(
    suggestions: List<String>,
    onSuggestionSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (suggestions.isEmpty()) return

    LazyRow(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(suggestions) { suggestion ->
            Surface(
                modifier = Modifier.clickable { onSuggestionSelected(suggestion) },
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.secondaryContainer
            ) {
                Text(
                    suggestion,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }
    }
}

private fun colorToLong(color: Color): Long {
    val alpha = (color.alpha * 255).toInt()
    val red = (color.red * 255).toInt()
    val green = (color.green * 255).toInt()
    val blue = (color.blue * 255).toInt()
    return ((alpha.toLong() shl 24) or (red.toLong() shl 16) or (green.toLong() shl 8) or blue.toLong())
}
