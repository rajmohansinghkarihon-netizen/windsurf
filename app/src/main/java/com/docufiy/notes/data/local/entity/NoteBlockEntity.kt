package com.docufiy.notes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "note_blocks",
    foreignKeys = [
        ForeignKey(
            entity = NoteEntity::class,
            parentColumns = ["id"],
            childColumns = ["noteId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("noteId")]
)
data class NoteBlockEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val noteId: Long,
    val type: String, // text, heading, bullet, numbered, image, ocr_text
    val content: String = "",
    val orderIndex: Int = 0,
    val fontFamily: String = "default",
    val fontSize: Float = 16f,
    val isBold: Boolean = false,
    val isItalic: Boolean = false,
    val isUnderline: Boolean = false,
    val textColor: Long = 0xFF000000,
    val highlightColor: Long = 0x00000000,
    val alignment: String = "left", // left, center, right
    val imageUri: String? = null,
    val imageWidth: Int? = null,
    val imageHeight: Int? = null
)
