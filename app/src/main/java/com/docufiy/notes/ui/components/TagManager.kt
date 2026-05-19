package com.docufiy.notes.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

data class NoteTag(
    val name: String,
    val color: Color
)

object TagDefaults {
    val predefinedTags = listOf(
        NoteTag("Work", Color(0xFF4CAF50)),
        NoteTag("Personal", Color(0xFF2196F3)),
        NoteTag("Study", Color(0xFFFF9800)),
        NoteTag("Ideas", Color(0xFF9C27B0)),
        NoteTag("Important", Color(0xFFF44336)),
        NoteTag("Shopping", Color(0xFF00BCD4)),
        NoteTag("Health", Color(0xFF8BC34A)),
        NoteTag("Finance", Color(0xFFFF5722))
    )

    val tagColors = listOf(
        Color(0xFF4CAF50),
        Color(0xFF2196F3),
        Color(0xFFFF9800),
        Color(0xFF9C27B0),
        Color(0xFFF44336),
        Color(0xFF00BCD4),
        Color(0xFF8BC34A),
        Color(0xFFFF5722),
        Color(0xFF607D8B),
        Color(0xFFE91E63)
    )

    fun getTagColor(tagName: String): Color {
        val predefined = predefinedTags.find { it.name.equals(tagName, ignoreCase = true) }
        if (predefined != null) return predefined.color
        val hash = tagName.hashCode()
        return tagColors[Math.abs(hash) % tagColors.size]
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TagChips(
    tags: String,
    onTagsChanged: (String) -> Unit,
    modifier: Modifier = Modifier,
    editable: Boolean = true
) {
    val tagList = if (tags.isBlank()) emptyList() else tags.split(",").map { it.trim() }.filter { it.isNotBlank() }
    var showAddDialog by remember { mutableStateOf(false) }

    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        tagList.forEach { tag ->
            val tagColor = TagDefaults.getTagColor(tag)
            FilterChip(
                selected = true,
                onClick = {},
                label = { Text(tag, style = MaterialTheme.typography.labelSmall) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = tagColor.copy(alpha = 0.2f),
                    selectedLabelColor = tagColor
                ),
                trailingIcon = if (editable) {
                    {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Remove tag",
                            modifier = Modifier
                                .size(14.dp)
                                .clickable {
                                    val newTags = tagList.filter { it != tag }.joinToString(",")
                                    onTagsChanged(newTags)
                                },
                            tint = tagColor
                        )
                    }
                } else null
            )
        }

        if (editable) {
            FilterChip(
                selected = false,
                onClick = { showAddDialog = true },
                label = { Text("Add Tag", style = MaterialTheme.typography.labelSmall) },
                leadingIcon = { Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp)) }
            )
        }
    }

    if (showAddDialog) {
        AddTagDialog(
            existingTags = tagList,
            onAddTag = { newTag ->
                val newTags = if (tags.isBlank()) newTag else "$tags,$newTag"
                onTagsChanged(newTags)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AddTagDialog(
    existingTags: List<String>,
    onAddTag: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var customTag by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Tag") },
        text = {
            Column {
                Text("Quick Tags", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    TagDefaults.predefinedTags.forEach { tag ->
                        if (tag.name !in existingTags) {
                            FilterChip(
                                selected = false,
                                onClick = { onAddTag(tag.name) },
                                label = { Text(tag.name) },
                                leadingIcon = {
                                    Box(
                                        modifier = Modifier
                                            .size(12.dp)
                                            .clip(CircleShape)
                                            .background(tag.color)
                                    )
                                }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Custom Tag", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = customTag,
                    onValueChange = { customTag = it },
                    placeholder = { Text("Enter custom tag") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (customTag.isNotBlank()) {
                        onAddTag(customTag.trim())
                    }
                },
                enabled = customTag.isNotBlank()
            ) { Text("Add") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TagFilterBar(
    allTags: List<String>,
    selectedTag: String?,
    onTagSelected: (String?) -> Unit,
    modifier: Modifier = Modifier
) {
    FlowRow(
        modifier = modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        FilterChip(
            selected = selectedTag == null,
            onClick = { onTagSelected(null) },
            label = { Text("All") }
        )
        allTags.forEach { tag ->
            val tagColor = TagDefaults.getTagColor(tag)
            FilterChip(
                selected = selectedTag == tag,
                onClick = { onTagSelected(if (selectedTag == tag) null else tag) },
                label = { Text(tag) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = tagColor.copy(alpha = 0.2f),
                    selectedLabelColor = tagColor
                )
            )
        }
    }
}
