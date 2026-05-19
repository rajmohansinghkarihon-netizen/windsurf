package com.docufiy.notes.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.docufiy.notes.data.local.entity.DeletedNoteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DeletedNoteDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(deletedNote: DeletedNoteEntity): Long

    @Delete
    suspend fun delete(deletedNote: DeletedNoteEntity)

    @Query("SELECT * FROM deleted_notes WHERE isRestorable = 1 ORDER BY deletedAt DESC")
    fun getRestorableNotes(): Flow<List<DeletedNoteEntity>>

    @Query("SELECT * FROM deleted_notes ORDER BY deletedAt DESC")
    fun getAllDeletedNotes(): Flow<List<DeletedNoteEntity>>

    @Query("DELETE FROM deleted_notes WHERE deletedAt < :cutoff")
    suspend fun purgeOldEntries(cutoff: Long)
}
