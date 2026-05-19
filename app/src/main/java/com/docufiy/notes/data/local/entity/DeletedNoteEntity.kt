package com.docufiy.notes.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "deleted_notes")
data class DeletedNoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val originalNoteId: Long,
    val title: String,
    val contentSnapshot: String,
    val deletedAt: Long = System.currentTimeMillis(),
    val isRestorable: Boolean = true
)
