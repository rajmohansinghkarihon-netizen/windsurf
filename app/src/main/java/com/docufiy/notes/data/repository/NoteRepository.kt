package com.docufiy.notes.data.repository

import com.docufiy.notes.data.local.entity.DeletedNoteEntity
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.data.local.entity.NoteExportEntity
import com.docufiy.notes.data.local.entity.NoteHistoryEntity
import com.docufiy.notes.data.local.entity.NoteImageEntity
import kotlinx.coroutines.flow.Flow

interface NoteRepository {
    // Notes
    fun getAllNotes(): Flow<List<NoteEntity>>
    fun getFavoriteNotes(): Flow<List<NoteEntity>>
    fun searchNotes(query: String): Flow<List<NoteEntity>>
    fun getRecentNotes(limit: Int = 10): Flow<List<NoteEntity>>
    fun getNotesSortedByTitle(): Flow<List<NoteEntity>>
    fun getNotesSortedByDateCreated(): Flow<List<NoteEntity>>
    fun getDeletedNotes(): Flow<List<NoteEntity>>
    fun getNoteByIdFlow(noteId: Long): Flow<NoteEntity?>
    suspend fun getNoteById(noteId: Long): NoteEntity?
    suspend fun insertNote(note: NoteEntity): Long
    suspend fun updateNote(note: NoteEntity)
    suspend fun softDeleteNote(noteId: Long)
    suspend fun restoreNote(noteId: Long)
    suspend fun permanentlyDeleteNote(note: NoteEntity)
    suspend fun updateFavorite(noteId: Long, isFavorite: Boolean)
    suspend fun updateBackgroundColor(noteId: Long, color: Long)
    suspend fun updatePinned(noteId: Long, isPinned: Boolean)
    suspend fun updateTags(noteId: Long, tags: String)
    fun getNotesByTag(tag: String): Flow<List<NoteEntity>>
    fun getPinnedNotes(): Flow<List<NoteEntity>>
    suspend fun duplicateNote(noteId: Long): Long

    // Blocks
    fun getBlocksForNote(noteId: Long): Flow<List<NoteBlockEntity>>
    suspend fun getBlocksForNoteOnce(noteId: Long): List<NoteBlockEntity>
    suspend fun insertBlock(block: NoteBlockEntity): Long
    suspend fun insertBlocks(blocks: List<NoteBlockEntity>)
    suspend fun updateBlock(block: NoteBlockEntity)
    suspend fun deleteBlock(block: NoteBlockEntity)
    suspend fun deleteAllBlocksForNote(noteId: Long)

    // Images
    fun getImagesForNote(noteId: Long): Flow<List<NoteImageEntity>>
    suspend fun insertImage(image: NoteImageEntity): Long
    suspend fun updateImage(image: NoteImageEntity)
    suspend fun deleteImage(image: NoteImageEntity)

    // History
    fun getAllHistory(): Flow<List<NoteHistoryEntity>>
    fun getRecentlyEdited(limit: Int = 20): Flow<List<NoteHistoryEntity>>
    fun getRecentlyExported(limit: Int = 20): Flow<List<NoteHistoryEntity>>
    fun getRecentlyDeleted(limit: Int = 20): Flow<List<NoteHistoryEntity>>
    suspend fun addHistory(noteId: Long, action: String, details: String = "")

    // Exports
    fun getAllExports(): Flow<List<NoteExportEntity>>
    fun getRecentExports(limit: Int = 20): Flow<List<NoteExportEntity>>
    suspend fun insertExport(export: NoteExportEntity): Long

    // Deleted Notes Backup
    fun getRestorableNotes(): Flow<List<DeletedNoteEntity>>
    suspend fun insertDeletedBackup(deletedNote: DeletedNoteEntity): Long
}
