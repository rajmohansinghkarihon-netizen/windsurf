package com.docufiy.notes.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.docufiy.notes.data.local.entity.NoteExportEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteExportDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(export: NoteExportEntity): Long

    @Query("SELECT * FROM note_exports WHERE noteId = :noteId ORDER BY exportedAt DESC")
    fun getExportsForNote(noteId: Long): Flow<List<NoteExportEntity>>

    @Query("SELECT * FROM note_exports ORDER BY exportedAt DESC")
    fun getAllExports(): Flow<List<NoteExportEntity>>

    @Query("SELECT * FROM note_exports ORDER BY exportedAt DESC LIMIT :limit")
    fun getRecentExports(limit: Int = 20): Flow<List<NoteExportEntity>>
}
