package com.addventure.app.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.addventure.app.data.dao.*
import com.addventure.app.data.entity.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        LearnerProfile::class,
        ActivityRecord::class,
        ProgressRecord::class,
        SessionRecord::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AddVentureDatabase : RoomDatabase() {

    abstract fun learnerDao(): LearnerDao
    abstract fun activityRecordDao(): ActivityRecordDao
    abstract fun progressDao(): ProgressDao
    abstract fun sessionDao(): SessionDao

    companion object {
        @Volatile
        private var INSTANCE: AddVentureDatabase? = null

        fun getInstance(context: Context): AddVentureDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AddVentureDatabase::class.java,
                    "addventure_database"
                )
                    .addCallback(DatabaseCallback())
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class DatabaseCallback : Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                CoroutineScope(Dispatchers.IO).launch {
                    // Create default learner profile
                    database.learnerDao().insert(LearnerProfile(id = 1, name = "Learner"))

                    // Create initial progress records for each strategy
                    val strategies = listOf("COUNT_ALL", "COUNT_ON", "NUMBER_BONDS")
                    strategies.forEach { strategy ->
                        database.progressDao().insert(
                            ProgressRecord(learnerId = 1, strategy = strategy, unlockedLevel = 1)
                        )
                    }
                }
            }
        }
    }
}
