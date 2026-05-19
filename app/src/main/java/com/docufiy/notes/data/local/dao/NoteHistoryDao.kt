package com.docufiy.notes.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.docufiy.notes.data.local.entity.NoteHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteHistoryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(history: NoteHistoryEntity): Long

    @Query("SELECT * FROM note_history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<NoteHistoryEntity>>

    @Query("SELECT * FROM note_history WHERE noteId = :noteId ORDER BY timestamp DESC")
    fun getHistoryForNote(noteId: Long): Flow<List<NoteHistoryEntity>>

    @Query("SELECT * FROM note_history WHERE action = :action ORDER BY timestamp DESC")
    fun getHistoryByAction(action: String): Flow<List<NoteHistoryEntity>>

    @Query("SELECT * FROM note_history WHERE action = 'edited' ORDER BY timestamp DESC LIMIT :limit")
    fun getRecentlyEdited(limit: Int = 20): Flow<List<NoteHistoryEntity>>

    @Query("SELECT * FROM note_history WHERE action = 'exported' ORDER BY timestamp DESC LIMIT :limit")
    fun getRecentlyExported(limit: Int = 20): Flow<List<NoteHistoryEntity>>

    @Query("SELECT * FROM note_history WHERE action = 'deleted' ORDER BY timestamp DESC LIMIT :limit")
    fun getRecentlyDeleted(limit: Int = 20): Flow<List<NoteHistoryEntity>>

    @Query("DELETE FROM note_history WHERE noteId = :noteId")
    suspend fun deleteHistoryForNote(noteId: Long)
}
