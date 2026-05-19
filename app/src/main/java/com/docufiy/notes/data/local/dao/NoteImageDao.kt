package com.docufiy.notes.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.docufiy.notes.data.local.entity.NoteImageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteImageDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(image: NoteImageEntity): Long

    @Update
    suspend fun update(image: NoteImageEntity)

    @Delete
    suspend fun delete(image: NoteImageEntity)

    @Query("SELECT * FROM note_images WHERE noteId = :noteId ORDER BY createdAt ASC")
    fun getImagesForNote(noteId: Long): Flow<List<NoteImageEntity>>

    @Query("SELECT * FROM note_images WHERE noteId = :noteId ORDER BY createdAt ASC")
    suspend fun getImagesForNoteOnce(noteId: Long): List<NoteImageEntity>

    @Query("DELETE FROM note_images WHERE noteId = :noteId")
    suspend fun deleteAllForNote(noteId: Long)
}
