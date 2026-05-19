package com.docufiy.notes.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteBlockDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(block: NoteBlockEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(blocks: List<NoteBlockEntity>)

    @Update
    suspend fun update(block: NoteBlockEntity)

    @Delete
    suspend fun delete(block: NoteBlockEntity)

    @Query("SELECT * FROM note_blocks WHERE noteId = :noteId ORDER BY orderIndex ASC")
    fun getBlocksForNote(noteId: Long): Flow<List<NoteBlockEntity>>

    @Query("SELECT * FROM note_blocks WHERE noteId = :noteId ORDER BY orderIndex ASC")
    suspend fun getBlocksForNoteOnce(noteId: Long): List<NoteBlockEntity>

    @Query("DELETE FROM note_blocks WHERE noteId = :noteId")
    suspend fun deleteAllForNote(noteId: Long)

    @Query("SELECT * FROM note_blocks WHERE id = :blockId")
    suspend fun getBlockById(blockId: Long): NoteBlockEntity?

    @Query("SELECT MAX(orderIndex) FROM note_blocks WHERE noteId = :noteId")
    suspend fun getMaxOrderIndex(noteId: Long): Int?
}
