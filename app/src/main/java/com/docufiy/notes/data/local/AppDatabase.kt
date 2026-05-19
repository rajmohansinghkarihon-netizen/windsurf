package com.docufiy.notes.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.docufiy.notes.data.local.dao.DeletedNoteDao
import com.docufiy.notes.data.local.dao.NoteBlockDao
import com.docufiy.notes.data.local.dao.NoteDao
import com.docufiy.notes.data.local.dao.NoteExportDao
import com.docufiy.notes.data.local.dao.NoteHistoryDao
import com.docufiy.notes.data.local.dao.NoteImageDao
import com.docufiy.notes.data.local.entity.DeletedNoteEntity
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.local.entity.NoteExportEntity
import com.docufiy.notes.data.local.entity.NoteHistoryEntity
import com.docufiy.notes.data.local.entity.NoteImageEntity

@Database(
    entities = [
        NoteEntity::class,
        NoteBlockEntity::class,
        NoteImageEntity::class,
        NoteHistoryEntity::class,
        NoteExportEntity::class,
        DeletedNoteEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun noteBlockDao(): NoteBlockDao
    abstract fun noteImageDao(): NoteImageDao
    abstract fun noteHistoryDao(): NoteHistoryDao
    abstract fun noteExportDao(): NoteExportDao
    abstract fun deletedNoteDao(): DeletedNoteDao
}
