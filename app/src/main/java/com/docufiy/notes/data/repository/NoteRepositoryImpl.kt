package com.docufiy.notes.data.repository

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
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NoteRepositoryImpl @Inject constructor(
    private val noteDao: NoteDao,
    private val noteBlockDao: NoteBlockDao,
    private val noteImageDao: NoteImageDao,
    private val noteHistoryDao: NoteHistoryDao,
    private val noteExportDao: NoteExportDao,
    private val deletedNoteDao: DeletedNoteDao
) : NoteRepository {

    // Notes
    override fun getAllNotes(): Flow<List<NoteEntity>> = noteDao.getAllNotes()
    override fun getFavoriteNotes(): Flow<List<NoteEntity>> = noteDao.getFavoriteNotes()
    override fun searchNotes(query: String): Flow<List<NoteEntity>> = noteDao.searchNotes(query)
    override fun getRecentNotes(limit: Int): Flow<List<NoteEntity>> = noteDao.getRecentNotes(limit)
    override fun getNotesSortedByTitle(): Flow<List<NoteEntity>> = noteDao.getNotesSortedByTitle()
    override fun getNotesSortedByDateCreated(): Flow<List<NoteEntity>> = noteDao.getNotesSortedByDateCreated()
    override fun getDeletedNotes(): Flow<List<NoteEntity>> = noteDao.getDeletedNotes()
    override fun getNoteByIdFlow(noteId: Long): Flow<NoteEntity?> = noteDao.getNoteByIdFlow(noteId)
    override suspend fun getNoteById(noteId: Long): NoteEntity? = noteDao.getNoteById(noteId)

    override suspend fun insertNote(note: NoteEntity): Long {
        val id = noteDao.insert(note)
        addHistory(id, "created")
        return id
    }

    override suspend fun updateNote(note: NoteEntity) {
        noteDao.update(note.copy(updatedAt = System.currentTimeMillis()))
    }

    override suspend fun softDeleteNote(noteId: Long) {
        val note = noteDao.getNoteById(noteId)
        if (note != null) {
            val blocks = noteBlockDao.getBlocksForNoteOnce(noteId)
            val contentPreview = blocks.joinToString("\n") { it.content }.take(500)
            deletedNoteDao.insert(
                DeletedNoteEntity(
                    originalNoteId = noteId,
                    title = note.title,
                    contentSnapshot = contentPreview
                )
            )
            noteDao.softDelete(noteId)
            addHistory(noteId, "deleted")
        }
    }

    override suspend fun restoreNote(noteId: Long) {
        noteDao.restoreNote(noteId)
        addHistory(noteId, "restored")
    }

    override suspend fun permanentlyDeleteNote(note: NoteEntity) {
        noteDao.delete(note)
    }

    override suspend fun updateFavorite(noteId: Long, isFavorite: Boolean) {
        noteDao.updateFavorite(noteId, isFavorite)
    }

    override suspend fun updateBackgroundColor(noteId: Long, color: Long) {
        noteDao.updateBackgroundColor(noteId, color)
    }

    override suspend fun duplicateNote(noteId: Long): Long {
        val original = noteDao.getNoteById(noteId) ?: return -1
        val newNote = original.copy(
            id = 0,
            title = "${original.title} (Copy)",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        val newId = noteDao.insert(newNote)

        val blocks = noteBlockDao.getBlocksForNoteOnce(noteId)
        val newBlocks = blocks.map { it.copy(id = 0, noteId = newId) }
        noteBlockDao.insertAll(newBlocks)

        val images = noteImageDao.getImagesForNoteOnce(noteId)
        images.forEach { img ->
            noteImageDao.insert(img.copy(id = 0, noteId = newId))
        }

        addHistory(newId, "created", "Duplicated from note $noteId")
        return newId
    }

    // Blocks
    override fun getBlocksForNote(noteId: Long): Flow<List<NoteBlockEntity>> =
        noteBlockDao.getBlocksForNote(noteId)

    override suspend fun getBlocksForNoteOnce(noteId: Long): List<NoteBlockEntity> =
        noteBlockDao.getBlocksForNoteOnce(noteId)

    override suspend fun insertBlock(block: NoteBlockEntity): Long {
        val id = noteBlockDao.insert(block)
        noteDao.updateTimestamp(block.noteId)
        return id
    }

    override suspend fun insertBlocks(blocks: List<NoteBlockEntity>) {
        noteBlockDao.insertAll(blocks)
        blocks.firstOrNull()?.let { noteDao.updateTimestamp(it.noteId) }
    }

    override suspend fun updateBlock(block: NoteBlockEntity) {
        noteBlockDao.update(block)
        noteDao.updateTimestamp(block.noteId)
    }

    override suspend fun deleteBlock(block: NoteBlockEntity) {
        noteBlockDao.delete(block)
    }

    override suspend fun deleteAllBlocksForNote(noteId: Long) {
        noteBlockDao.deleteAllForNote(noteId)
    }

    // Images
    override fun getImagesForNote(noteId: Long): Flow<List<NoteImageEntity>> =
        noteImageDao.getImagesForNote(noteId)

    override suspend fun insertImage(image: NoteImageEntity): Long =
        noteImageDao.insert(image)

    override suspend fun updateImage(image: NoteImageEntity) =
        noteImageDao.update(image)

    override suspend fun deleteImage(image: NoteImageEntity) =
        noteImageDao.delete(image)

    // History
    override fun getAllHistory(): Flow<List<NoteHistoryEntity>> =
        noteHistoryDao.getAllHistory()

    override fun getRecentlyEdited(limit: Int): Flow<List<NoteHistoryEntity>> =
        noteHistoryDao.getRecentlyEdited(limit)

    override fun getRecentlyExported(limit: Int): Flow<List<NoteHistoryEntity>> =
        noteHistoryDao.getRecentlyExported(limit)

    override fun getRecentlyDeleted(limit: Int): Flow<List<NoteHistoryEntity>> =
        noteHistoryDao.getRecentlyDeleted(limit)

    override suspend fun addHistory(noteId: Long, action: String, details: String) {
        noteHistoryDao.insert(
            NoteHistoryEntity(
                noteId = noteId,
                action = action,
                details = details
            )
        )
    }

    // Exports
    override fun getAllExports(): Flow<List<NoteExportEntity>> =
        noteExportDao.getAllExports()

    override fun getRecentExports(limit: Int): Flow<List<NoteExportEntity>> =
        noteExportDao.getRecentExports(limit)

    override suspend fun insertExport(export: NoteExportEntity): Long =
        noteExportDao.insert(export)

    // Deleted Notes
    override fun getRestorableNotes(): Flow<List<DeletedNoteEntity>> =
        deletedNoteDao.getRestorableNotes()

    override suspend fun insertDeletedBackup(deletedNote: DeletedNoteEntity): Long =
        deletedNoteDao.insert(deletedNote)
}
