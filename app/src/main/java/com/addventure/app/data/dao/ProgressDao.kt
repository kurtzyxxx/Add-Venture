package com.addventure.app.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.addventure.app.data.entity.ProgressRecord

@Dao
interface ProgressDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: ProgressRecord): Long

    @Update
    suspend fun update(record: ProgressRecord)

    @Query("SELECT * FROM progress_record WHERE learnerId = :learnerId AND strategy = :strategy")
    suspend fun getByStrategy(learnerId: Long, strategy: String): ProgressRecord?

    @Query("SELECT * FROM progress_record WHERE learnerId = :learnerId")
    fun getAllByLearner(learnerId: Long): LiveData<List<ProgressRecord>>

    @Query("SELECT * FROM progress_record WHERE learnerId = :learnerId")
    suspend fun getAllByLearnerSync(learnerId: Long): List<ProgressRecord>

    @Query("UPDATE progress_record SET completedActivities = completedActivities + 1, totalCorrect = totalCorrect + :correct, totalAttempts = totalAttempts + 1, starsEarned = starsEarned + :stars, lastUpdated = :now WHERE learnerId = :learnerId AND strategy = :strategy")
    suspend fun recordCompletion(learnerId: Long, strategy: String, correct: Int, stars: Int, now: Long = System.currentTimeMillis())

    @Query("UPDATE progress_record SET unlockedLevel = :level WHERE learnerId = :learnerId AND strategy = :strategy")
    suspend fun unlockLevel(learnerId: Long, strategy: String, level: Int)
}
