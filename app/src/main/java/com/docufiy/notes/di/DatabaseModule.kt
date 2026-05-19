package com.docufiy.notes.di

import android.content.Context
import androidx.room.Room
import com.docufiy.notes.data.local.AppDatabase
import com.docufiy.notes.data.local.dao.DeletedNoteDao
import com.docufiy.notes.data.local.dao.NoteBlockDao
import com.docufiy.notes.data.local.dao.NoteDao
import com.docufiy.notes.data.local.dao.NoteExportDao
import com.docufiy.notes.data.local.dao.NoteHistoryDao
import com.docufiy.notes.data.local.dao.NoteImageDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "docufiy_notes.db"
        ).fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideNoteDao(db: AppDatabase): NoteDao = db.noteDao()

    @Provides
    fun provideNoteBlockDao(db: AppDatabase): NoteBlockDao = db.noteBlockDao()

    @Provides
    fun provideNoteImageDao(db: AppDatabase): NoteImageDao = db.noteImageDao()

    @Provides
    fun provideNoteHistoryDao(db: AppDatabase): NoteHistoryDao = db.noteHistoryDao()

    @Provides
    fun provideNoteExportDao(db: AppDatabase): NoteExportDao = db.noteExportDao()

    @Provides
    fun provideDeletedNoteDao(db: AppDatabase): DeletedNoteDao = db.deletedNoteDao()
}
