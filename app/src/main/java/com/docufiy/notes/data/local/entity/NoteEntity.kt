package com.docufiy.notes.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isFavorite: Boolean = false,
    val backgroundColor: Long = 0xFFFFFFFF,
    val isDraft: Boolean = true,
    val isDeleted: Boolean = false,
    val deletedAt: Long? = null
)
