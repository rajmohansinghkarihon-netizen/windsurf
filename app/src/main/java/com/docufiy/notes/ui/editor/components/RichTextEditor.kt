package com.docufiy.notes.ui.editor.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DragIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.docufiy.notes.data.local.entity.NoteBlockEntity

@Composable
fun NoteBlockEditor(
    block: NoteBlockEntity,
    index: Int,
    isSelected: Boolean,
    onContentChange: (String) -> Unit,
    onFocused: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (isSelected) Modifier.border(
                    1.dp,
                    MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                    RoundedCornerShape(4.dp)
                ) else Modifier
            )
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Block type indicator
        when (block.type) {
            "bullet" -> {
                Text(
                    "•",
                    modifier = Modifier
                        .padding(start = 8.dp, top = 4.dp)
                        .width(16.dp),
                    style = TextStyle(fontSize = block.fontSize.sp),
                    color = Color(block.textColor)
                )
            }
            "numbered" -> {
                Text(
                    "${block.orderIndex + 1}.",
                    modifier = Modifier
                        .padding(start = 8.dp, top = 4.dp)
                        .width(24.dp),
                    style = TextStyle(fontSize = block.fontSize.sp),
                    color = Color(block.textColor)
                )
            }
            "image" -> {
                if (block.imageUri != null) {
                    ImageBlockView(
                        imageUri = block.imageUri,
                        width = block.imageWidth,
                        height = block.imageHeight,
                        onDelete = onDelete,
                        modifier = Modifier.weight(1f)
                    )
                    return
                }
            }
        }

        // Text content
        Column(modifier = Modifier.weight(1f)) {
            if (block.highlightColor != 0L && block.highlightColor != 0x00000000L) {
                Box(
                    modifier = Modifier.background(Color(block.highlightColor))
                ) {
                    BlockTextField(
                        block = block,
                        focusRequester = focusRequester,
                        onContentChange = onContentChange,
                        onFocused = onFocused
                    )
                }
            } else {
                BlockTextField(
                    block = block,
                    focusRequester = focusRequester,
                    onContentChange = onContentChange,
                    onFocused = onFocused
                )
            }
        }
    }
}

@Composable
private fun BlockTextField(
    block: NoteBlockEntity,
    focusRequester: FocusRequester,
    onContentChange: (String) -> Unit,
    onFocused: () -> Unit
) {
    val textStyle = TextStyle(
        fontSize = if (block.type == "heading") (block.fontSize * 1.5f).sp else block.fontSize.sp,
        fontWeight = if (block.isBold || block.type == "heading") FontWeight.Bold else FontWeight.Normal,
        fontStyle = if (block.isItalic) FontStyle.Italic else FontStyle.Normal,
        textDecoration = if (block.isUnderline) TextDecoration.Underline else TextDecoration.None,
        color = Color(block.textColor),
        textAlign = when (block.alignment) {
            "center" -> TextAlign.Center
            "right" -> TextAlign.End
            else -> TextAlign.Start
        },
        fontFamily = when (block.fontFamily) {
            "serif" -> FontFamily.Serif
            "monospace" -> FontFamily.Monospace
            "cursive" -> FontFamily.Cursive
            else -> FontFamily.Default
        }
    )

    val placeholder = when (block.type) {
        "heading" -> "Heading"
        "ocr_text" -> "OCR extracted text"
        else -> "Start typing..."
    }

    BasicTextField(
        value = block.content,
        onValueChange = onContentChange,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .focusRequester(focusRequester)
            .onFocusChanged { if (it.isFocused) onFocused() },
        textStyle = textStyle,
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        decorationBox = { innerTextField ->
            Box {
                if (block.content.isEmpty()) {
                    Text(
                        placeholder,
                        style = textStyle.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    )
                }
                innerTextField()
            }
        }
    )
}

@Composable
fun ImageBlockView(
    imageUri: String,
    width: Int?,
    height: Int?,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.padding(8.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box {
                AsyncImage(
                    model = imageUri,
                    contentDescription = "Note image",
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(
                            if (height != null && width != null) {
                                val aspectRatio = width.toFloat() / height.toFloat()
                                Modifier.height((300 / aspectRatio).dp)
                            } else Modifier.height(200.dp)
                        )
                )
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(32.dp)
                        .background(
                            Color.Black.copy(alpha = 0.5f),
                            RoundedCornerShape(16.dp)
                        )
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Delete image",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
